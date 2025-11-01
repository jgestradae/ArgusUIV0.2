"""
Argus Outbox File Watcher Service
Continuously monitors the outbox folder for new response files
"""

import asyncio
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class ArgusResponseHandler(FileSystemEventHandler):
    """Handler for Argus XML response files"""
    
    def __init__(self, xml_processor, db, loop=None, callback=None):
        """
        Initialize handler
        
        Args:
            xml_processor: ArgusXMLProcessor instance
            db: Database connection
            loop: asyncio event loop
            callback: Optional callback function for new responses
        """
        self.xml_processor = xml_processor
        self.db = db
        self.loop = loop
        self.callback = callback
        self.processing = set()  # Track files being processed
        
    def on_created(self, event):
        """Called when a file is created in the monitored directory"""
        if event.is_directory:
            return
            
        file_path = Path(event.src_path)
        
        # Only process XML files with -R suffix (responses)
        if file_path.suffix.lower() == '.xml' and '-R' in file_path.stem:
            logger.info(f"New response detected: {file_path.name}")
            
            # Avoid duplicate processing
            if str(file_path) in self.processing:
                return
                
            self.processing.add(str(file_path))
            
            # Process the file in the main event loop
            if self.loop and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self._process_response(file_path),
                    self.loop
                )
            else:
                logger.error("No running event loop available for processing response")
    
    async def _process_response(self, file_path: Path):
        """
        Process a response file
        
        Args:
            file_path: Path to the response XML file
        """
        try:
            # Wait a moment to ensure file is fully written
            await asyncio.sleep(0.5)
            
            # Check if file still exists (might have been moved already)
            if not file_path.exists():
                logger.warning(f"File no longer exists: {file_path.name}")
                return
            
            logger.info(f"Processing response: {file_path.name}")
            
            # Parse the response
            response_data = self.xml_processor.parse_response(str(file_path))
            
            if not response_data:
                logger.warning(f"Failed to parse response: {file_path.name}")
                return
            
            order_id = response_data.get("order_id")
            order_type = response_data.get("order_type")
            order_state = response_data.get("order_state")
            
            logger.info(f"Response parsed - Order: {order_id}, Type: {order_type}, State: {order_state}")
            
            # Update order in database
            if order_id:
                update_result = await self.db.argus_orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "order_state": order_state or "Finished",
                        "xml_response_file": str(file_path),
                        "response_received_at": datetime.now(),
                        "updated_at": datetime.now()
                    }}
                )
                
                if update_result.modified_count > 0:
                    logger.info(f"Order updated: {order_id}")
                else:
                    logger.warning(f"Order not found in database: {order_id}")
            
            # Process based on order type
            if order_type == "GSS":
                await self._process_gss_response(response_data)
            elif order_type == "GSP":
                await self._process_gsp_response(response_data)
            elif order_type == "OR":
                await self._process_measurement_response(response_data)
            elif order_type in ["IFL", "IOFL"]:
                await self._process_ifl_response(file_path)
            elif order_type == "ITL":
                await self._process_itl_response(file_path)
            
            # Move file to processed folder
            processed_path = self.xml_processor.data_path / "xml_responses" / file_path.name
            processed_path.parent.mkdir(parents=True, exist_ok=True)
            
            if file_path.exists():
                file_path.rename(processed_path)
                logger.info(f"Response moved to: {processed_path}")
            
            # Call callback if provided
            if self.callback:
                await self.callback(response_data)
                
        except Exception as e:
            logger.error(f"Error processing response {file_path.name}: {e}", exc_info=True)
        finally:
            # Remove from processing set
            self.processing.discard(str(file_path))
    
    async def _process_gss_response(self, response_data: dict):
        """Process GSS (Get System State) response"""
        try:
            from models import ArgusSystemState
            
            system_state = ArgusSystemState(
                is_running=response_data.get("is_running", False),
                current_user=response_data.get("current_user", ""),
                monitoring_time=response_data.get("monitoring_time", 0),
                stations=response_data.get("stations", []),
                devices=response_data.get("devices", [])
            )
            
            await self.db.system_states.insert_one(system_state.dict())
            logger.info(f"System state saved with {len(response_data.get('stations', []))} stations")
            
        except Exception as e:
            logger.error(f"Error processing GSS response: {e}")
    
    async def _process_gsp_response(self, response_data: dict):
        """Process GSP (Get System Parameters) response"""
        try:
            # Extract the parsed signal paths and stations data
            signal_paths = response_data.get("signal_paths", [])
            stations = response_data.get("stations", [])
            
            # Save system parameters with detailed structure
            await self.db.system_parameters.insert_one({
                "order_id": response_data.get("order_id"),
                "timestamp": datetime.now(),
                "parameter_type": "GSP",
                "signal_paths": signal_paths,
                "stations": stations,
                "raw_response": response_data
            })
            logger.info(f"System parameters saved: {len(stations)} stations, {len(signal_paths)} signal paths")
            
        except Exception as e:
            logger.error(f"Error processing GSP response: {e}", exc_info=True)
    
    async def _process_measurement_response(self, response_data: dict):
        """Process OR (Measurement Order) response and extract CSV data"""
        try:
            from models import MeasurementResult
            
            # Parse the XML file to extract measurement data and create CSV
            xml_file = response_data.get("raw_xml_file")
            if xml_file:
                parsed_data = self.xml_processor.parse_measurement_result(xml_file)
                
                # Create MeasurementResult model
                measurement_result = MeasurementResult(
                    order_id=response_data.get("order_id", parsed_data.get("order_id", "unknown")),
                    measurement_type=parsed_data.get("measurement_type", "FFM"),
                    station_name=parsed_data.get("station_name", "unknown"),
                    station_pc=parsed_data.get("station_pc", "unknown"),
                    signal_path=parsed_data.get("signal_path", "unknown"),
                    frequency_single=parsed_data.get("frequency_single"),
                    frequency_range_low=parsed_data.get("frequency_range_low"),
                    frequency_range_high=parsed_data.get("frequency_range_high"),
                    measurement_start=parsed_data.get("measurement_start", datetime.now()),
                    measurement_end=parsed_data.get("measurement_end"),
                    xml_file_path=xml_file,
                    csv_file_path=parsed_data.get("csv_file_path"),
                    status=parsed_data.get("status", "completed"),
                    result_type=parsed_data.get("result_type", "MR"),
                    data_points=parsed_data.get("data_points", 0),
                    file_size=parsed_data.get("file_size", 0),
                    operator_name=parsed_data.get("operator_name")
                )
                
                # Save to measurement_results collection
                await self.db.measurement_results.insert_one(measurement_result.dict())
                logger.info(f"Measurement result saved: {measurement_result.order_id}, {measurement_result.data_points} data points")
            else:
                # Fallback for older format
                await self.db.measurements.insert_one({
                    "order_id": response_data.get("order_id"),
                    "timestamp": datetime.now(),
                    "measurement_type": response_data.get("measurement_type"),
                    "result_data": response_data
                })
                logger.info(f"Measurement result saved (legacy format): {response_data.get('order_id')}")
            
        except Exception as e:
            logger.error(f"Error processing measurement response: {e}", exc_info=True)

    async def _process_ifl_response(self, file_path: Path):
        """Process IFL/IOFL (Import Frequency List) response"""
        try:
            from smdi_models import FrequencyListResult, FrequencyListItem
            
            # Parse the IFL response XML
            parsed_data = self.xml_processor._parse_smdi_frequency_list_response(str(file_path))
            
            if not parsed_data or "error" in parsed_data:
                logger.error(f"Failed to parse IFL response: {parsed_data.get('error')}")
                return
            
            # Try to find the original query request from database to get query_params
            order_id = parsed_data.get("order_id")
            original_request = None
            if order_id:
                original_request = await self.db.smdi_queries.find_one({"order_id": order_id})
            
            # Create FrequencyListResult
            freq_list_result = FrequencyListResult(
                order_id=parsed_data.get("order_id", "unknown"),
                order_type=parsed_data.get("order_type", "IOFL"),
                query_name=original_request.get("query_name") if original_request else None,
                status=parsed_data.get("status", "Unknown"),
                error_code=parsed_data.get("error_code"),
                error_message=parsed_data.get("error_message"),
                query_params=original_request.get("query_params") if original_request else {},
                frequencies=[FrequencyListItem(**freq) for freq in parsed_data.get("frequencies", [])]
            )
            
            # Save to frequency_lists collection
            await self.db.frequency_lists.insert_one(freq_list_result.dict())
            logger.info(f"Frequency list saved: {freq_list_result.order_id}, {len(freq_list_result.frequencies)} frequencies")
            
        except Exception as e:
            logger.error(f"Error processing IFL response: {e}", exc_info=True)
    
    async def _process_itl_response(self, file_path: Path):
        """Process ITL (Import Transmitter List) response"""
        try:
            from smdi_models import TransmitterListResult, TransmitterListItem
            
            # Parse the ITL response XML
            parsed_data = self.xml_processor._parse_smdi_transmitter_list_response(str(file_path))
            
            if not parsed_data or "error" in parsed_data:
                logger.error(f"Failed to parse ITL response: {parsed_data.get('error')}")
                return
            
            # Try to find the original query request from database to get query_params
            order_id = parsed_data.get("order_id")
            original_request = None
            if order_id:
                original_request = await self.db.smdi_queries.find_one({"order_id": order_id})
            
            # Create TransmitterListResult
            tx_list_result = TransmitterListResult(
                order_id=parsed_data.get("order_id", "unknown"),
                order_type=parsed_data.get("order_type", "ITL"),
                query_name=original_request.get("query_name") if original_request else None,
                status=parsed_data.get("status", "Unknown"),
                error_code=parsed_data.get("error_code"),
                error_message=parsed_data.get("error_message"),
                query_params=original_request.get("query_params") if original_request else {},
                transmitters=[TransmitterListItem(**tx) for tx in parsed_data.get("transmitters", [])]
            )
            
            # Save to transmitter_lists collection
            await self.db.transmitter_lists.insert_one(tx_list_result.dict())
            logger.info(f"Transmitter list saved: {tx_list_result.order_id}, {len(tx_list_result.transmitters)} transmitters")
            
        except Exception as e:
            logger.error(f"Error processing ITL response: {e}", exc_info=True)


class ArgusFileWatcher:
    """File watcher service for Argus outbox folder"""
    
    def __init__(self, outbox_path: str, xml_processor, db, loop=None, callback=None):
        """
        Initialize file watcher
        
        Args:
            outbox_path: Path to Argus outbox folder
            xml_processor: ArgusXMLProcessor instance
            db: Database connection
            loop: asyncio event loop
            callback: Optional callback for new responses
        """
        self.outbox_path = Path(outbox_path)
        self.xml_processor = xml_processor
        self.db = db
        self.loop = loop
        self.callback = callback
        self.observer = None
        self.handler = None
        
    def start(self):
        """Start watching the outbox folder"""
        try:
            # Ensure outbox path exists
            self.outbox_path.mkdir(parents=True, exist_ok=True)
            
            # Create event handler with event loop
            self.handler = ArgusResponseHandler(
                self.xml_processor, 
                self.db,
                self.loop,
                self.callback
            )
            
            # Create observer
            self.observer = Observer()
            self.observer.schedule(
                self.handler, 
                str(self.outbox_path), 
                recursive=False
            )
            
            # Start observer
            self.observer.start()
            logger.info(f"File watcher started monitoring: {self.outbox_path}")
            
        except Exception as e:
            logger.error(f"Error starting file watcher: {e}")
            raise
    
    def stop(self):
        """Stop watching the outbox folder"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("File watcher stopped")
    
    async def process_existing_files(self):
        """Process any existing response files in the outbox"""
        try:
            if not self.outbox_path.exists():
                return
            
            # Process all existing -R.xml files
            for xml_file in self.outbox_path.glob("*-R.xml"):
                logger.info(f"Processing existing response: {xml_file.name}")
                await self.handler._process_response(xml_file)
                
        except Exception as e:
            logger.error(f"Error processing existing files: {e}")
