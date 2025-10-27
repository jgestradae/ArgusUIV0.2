import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from amm_models import (
    AMMConfiguration, AMMExecution, TimingDefinition, MeasurementDefinition,
    ScheduleType, AMMStatus
)
from xml_processor import ArgusXMLProcessor
from croniter import croniter

logger = logging.getLogger(__name__)

class AMMScheduler:
    def __init__(self, db: AsyncIOMotorDatabase, xml_processor: ArgusXMLProcessor):
        self.db = db
        self.xml_processor = xml_processor
        self.running = False
        self.scheduler_task = None
        
    async def start_scheduler(self):
        """Start the AMM scheduler"""
        if self.running:
            return
            
        self.running = True
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("AMM Scheduler started")
        
    async def stop_scheduler(self):
        """Stop the AMM scheduler"""
        self.running = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("AMM Scheduler stopped")
        
    async def _scheduler_loop(self):
        """Main scheduler loop - runs every minute"""
        while self.running:
            try:
                current_time = datetime.utcnow()
                await self._check_scheduled_amms(current_time)
                
                # Sleep for 60 seconds
                await asyncio.sleep(60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(60)  # Continue after error
                
    async def _check_scheduled_amms(self, current_time: datetime):
        """Check for AMMs that should be executed now"""
        try:
            # Get all active AMM configurations
            active_amms = await self.db.amm_configurations.find({
                "status": AMMStatus.ACTIVE
            }).to_list(length=None)
            
            for amm_config_data in active_amms:
                amm_config = AMMConfiguration(**amm_config_data)
                
                # Get timing definition
                timing_def_data = await self.db.timing_definitions.find_one({
                    "id": amm_config.timing_definition_id
                })
                
                if not timing_def_data:
                    logger.warning(f"Timing definition not found for AMM {amm_config.id}")
                    continue
                    
                timing_def = TimingDefinition(**timing_def_data)
                
                # Check if AMM should execute now
                should_execute = await self._should_execute_now(amm_config, timing_def, current_time)
                
                if should_execute:
                    await self._execute_amm(amm_config)
                    
        except Exception as e:
            logger.error(f"Error checking scheduled AMMs: {e}")
            
    async def _should_execute_now(self, amm_config: AMMConfiguration, 
                                timing_def: TimingDefinition, current_time: datetime) -> bool:
        """Determine if an AMM should execute at the current time"""
        
        # Check if there's already a running execution
        running_execution = await self.db.amm_executions.find_one({
            "amm_config_id": amm_config.id,
            "status": "running"
        })
        
        if running_execution:
            return False  # Don't start if already running
            
        # Check last execution to avoid duplicate runs
        if amm_config.last_execution:
            time_since_last = current_time - amm_config.last_execution
            if time_since_last.total_seconds() < 60:  # Less than 1 minute
                return False
                
        return self._check_timing_conditions(timing_def, current_time, amm_config)
        
    def _check_timing_conditions(self, timing_def: TimingDefinition, current_time: datetime, amm_config: AMMConfiguration) -> bool:
        """Check if timing conditions are met for execution"""
        
        if timing_def.schedule_type == ScheduleType.ALWAYS:
            return True
            
        elif timing_def.schedule_type == ScheduleType.SPAN:
            if timing_def.start_date and timing_def.end_date:
                return timing_def.start_date <= current_time <= timing_def.end_date
                
        elif timing_def.schedule_type == ScheduleType.DAILY:
            if timing_def.start_time and timing_def.end_time:
                current_time_only = current_time.time()
                return timing_def.start_time <= current_time_only <= timing_def.end_time
                
        elif timing_def.schedule_type == ScheduleType.WEEKDAYS:
            if timing_def.weekdays and timing_def.start_time and timing_def.end_time:
                current_weekday = current_time.weekday()  # 0=Monday
                current_time_only = current_time.time()
                
                return (current_weekday in timing_def.weekdays and 
                       timing_def.start_time <= current_time_only <= timing_def.end_time)
                       
        elif timing_def.schedule_type == ScheduleType.INTERVAL:
            if not amm_config.last_execution:
                return True  # First execution
                
            interval_seconds = 0
            if timing_def.interval_minutes:
                interval_seconds += timing_def.interval_minutes * 60
            if timing_def.interval_hours:
                interval_seconds += timing_def.interval_hours * 3600
            if timing_def.interval_days:
                interval_seconds += timing_def.interval_days * 86400
                
            if interval_seconds > 0:
                time_since_last = current_time - amm_config.last_execution
                return time_since_last.total_seconds() >= interval_seconds
                
        return False
        
    async def _execute_amm(self, amm_config: AMMConfiguration):
        """Execute an AMM configuration"""
        try:
            logger.info(f"Starting execution of AMM: {amm_config.name}")
            
            # Create execution record
            execution = AMMExecution(
                amm_config_id=amm_config.id,
                started_at=datetime.utcnow()
            )
            
            await self.db.amm_executions.insert_one(execution.dict())
            
            # Get measurement definition
            measurement_def_data = await self.db.measurement_definitions.find_one({
                "id": amm_config.measurement_definition_id
            })
            
            if not measurement_def_data:
                raise Exception(f"Measurement definition not found: {amm_config.measurement_definition_id}")
                
            measurement_def = MeasurementDefinition(**measurement_def_data)
            
            # Generate XML order for Argus
            order_id = self.xml_processor.generate_order_id("AMM")
            
            # Convert AMM measurement to XML order parameters
            xml_params = self._convert_amm_to_xml_params(measurement_def, order_id)
            
            # Create XML order
            xml_content = self.xml_processor.create_measurement_order(order_id, xml_params)
            xml_file = self.xml_processor.save_request(xml_content, order_id)
            logger.debug(f"XML order saved to: {xml_file}")
            
            # Update execution with generated order
            await self.db.amm_executions.update_one(
                {"id": execution.id},
                {
                    "$push": {"generated_orders": order_id},
                    "$inc": {"measurements_performed": 1}
                }
            )
            
            # Update AMM configuration
            await self.db.amm_configurations.update_one(
                {"id": amm_config.id},
                {
                    "$set": {"last_execution": datetime.utcnow()},
                    "$inc": {"execution_count": 1}
                }
            )
            
            logger.info(f"AMM execution started successfully: {order_id}")
            
        except Exception as e:
            logger.error(f"Error executing AMM {amm_config.id}: {e}")
            
            # Update execution with error
            await self.db.amm_executions.update_one(
                {"id": execution.id},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e),
                        "completed_at": datetime.utcnow()
                    }
                }
            )
            
            # Update AMM config error count
            await self.db.amm_configurations.update_one(
                {"id": amm_config.id},
                {
                    "$inc": {"error_count": 1},
                    "$set": {"last_error": str(e)}
                }
            )
            
    def _convert_amm_to_xml_params(self, measurement_def: MeasurementDefinition, order_id: str) -> dict:
        """Convert AMM measurement definition to XML order parameters"""
        params = {
            "name": f"AMM_{measurement_def.name}",
            "task": measurement_def.measurement_type.value,
            "result_type": "CMR",  # Changed to CMR (Compressed Measurement Result)
            "priority": "LOW",
            "creator": "Extern"
        }
        
        # Station parameters - CRITICAL for ORM 4.2
        if measurement_def.station_names and len(measurement_def.station_names) > 0:
            # Use first station from the list
            station_pc = measurement_def.station_names[0]
            params["station_pc"] = station_pc
            
        # Signal path (system path) - ORM 4.2: Use MSP_SIG_PATH not device name
        # The device_name should actually be the signal path (e.g., "ADD197+075-EB500 DF")
        # For now, we'll construct a default signal path from device
        if measurement_def.device_name:
            # If device_name looks like a signal path (contains +, -, etc), use it directly
            if any(char in measurement_def.device_name for char in ['+', '-', ' ']):
                params["signal_path"] = measurement_def.device_name
            else:
                # Otherwise, construct a basic signal path
                params["signal_path"] = f"{measurement_def.device_name}"
        else:
            params["signal_path"] = "ADD197+075-EB500 DF"  # Default
            
        # Station metadata
        params["station_name"] = params.get("station_pc", "UMS300-100801")
        params["station_type"] = "F"  # Fixed station
        
        # Frequency parameters
        params["freq_mode"] = measurement_def.frequency_mode
        
        if measurement_def.frequency_mode == "S":
            params["freq_single"] = measurement_def.frequency_single
        elif measurement_def.frequency_mode == "R":
            params["freq_range_low"] = measurement_def.frequency_range_start
            params["freq_range_high"] = measurement_def.frequency_range_end
            if measurement_def.frequency_step:
                params["freq_step"] = measurement_def.frequency_step
        elif measurement_def.frequency_mode == "L":
            params["freq_list"] = measurement_def.frequency_list
            
        # Receiver parameters
        receiver = measurement_def.receiver_config
        if receiver.if_bandwidth:
            params["if_bandwidth"] = receiver.if_bandwidth
        if receiver.rf_attenuation:
            params["rf_attenuation"] = receiver.rf_attenuation
        else:
            params["rf_attenuation"] = "Auto"
            
        if receiver.demodulation:
            params["demod"] = receiver.demodulation
        else:
            params["demod"] = "Off"
            
        if receiver.measurement_time:
            params["meas_time"] = receiver.measurement_time
        else:
            params["meas_time"] = -1
            
        if receiver.detector:
            params["detect_type"] = receiver.detector
        else:
            params["detect_type"] = "Peak"
            
        # Additional MDT parameters with defaults
        params["if_attenuation"] = "Normal"
        params["preamplification"] = "Off"
        params["mode"] = "Normal"
        params["if_span"] = 250000
        params["squelch"] = "Off"
        params["hold_time"] = 0
            
        # Measurement data type
        if measurement_def.measured_parameters:
            if "Level" in measurement_def.measured_parameters:
                params["meas_data_type"] = "LV"
            elif "Frequency" in measurement_def.measured_parameters:
                params["meas_data_type"] = "FM"
            elif "Bearing" in measurement_def.measured_parameters:
                params["meas_data_type"] = "BE"
        else:
            params["meas_data_type"] = "LV"  # Default to Level
            
        # Antenna configuration
        antenna = measurement_def.antenna_config
        if antenna.antenna_name:
            params["ant_port"] = antenna.antenna_name
        else:
            params["ant_port"] = "P1"
        params["ant_mode"] = "FIX"
        
        # Time parameters
        params["time_mode"] = "P"  # Periodic
        params["start_time"] = datetime.now()
        params["stop_time"] = datetime.now()
        
        # Location parameters (defaults for Colombia)
        params["longitude"] = -77.264667
        params["latitude"] = 1.201194
        params["height"] = 600
        
        # Operator name
        params["operator_name"] = "ArgusUI"
                
        return params
        
    async def get_next_execution_time(self, amm_config: AMMConfiguration, 
                                    timing_def: TimingDefinition) -> Optional[datetime]:
        """Calculate the next execution time for an AMM"""
        current_time = datetime.utcnow()
        
        if timing_def.schedule_type == ScheduleType.ALWAYS:
            return current_time  # Always ready to run
            
        elif timing_def.schedule_type == ScheduleType.SPAN:
            if timing_def.start_date and current_time < timing_def.start_date:
                return timing_def.start_date
            elif timing_def.end_date and current_time > timing_def.end_date:
                return None  # Span has ended
            else:
                return current_time  # Within span
                
        elif timing_def.schedule_type == ScheduleType.INTERVAL:
            if not amm_config.last_execution:
                return current_time  # First execution
                
            interval_seconds = 0
            if timing_def.interval_minutes:
                interval_seconds += timing_def.interval_minutes * 60
            if timing_def.interval_hours:
                interval_seconds += timing_def.interval_hours * 3600
            if timing_def.interval_days:
                interval_seconds += timing_def.interval_days * 86400
                
            if interval_seconds > 0:
                return amm_config.last_execution + timedelta(seconds=interval_seconds)
                
        # For daily/weekdays, calculate next occurrence
        elif timing_def.schedule_type in [ScheduleType.DAILY, ScheduleType.WEEKDAYS]:
            if timing_def.start_time:
                next_date = current_time.date()
                if current_time.time() > timing_def.start_time:
                    next_date += timedelta(days=1)
                    
                next_datetime = datetime.combine(next_date, timing_def.start_time)
                
                # For weekdays, find next valid day
                if timing_def.schedule_type == ScheduleType.WEEKDAYS and timing_def.weekdays:
                    while next_datetime.weekday() not in timing_def.weekdays:
                        next_datetime += timedelta(days=1)
                        
                return next_datetime
                
        return None
