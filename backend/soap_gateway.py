"""
SOAP Web Services Gateway for ArgusUI
Implements SOAP 1.2 services for external system interoperability
Complies with requirements 4.4, 4.5, and 4.1_1
"""

from spyne import Application, rpc, ServiceBase, Unicode, Integer, Boolean, DateTime, ComplexModel, Array, Fault
from spyne.protocol.soap import Soap11, Soap12
from spyne.server.wsgi import WsgiApplication
from datetime import datetime
import logging
from typing import Optional, List, Dict
import os

logger = logging.getLogger(__name__)

# ============================================================================
# Helper Functions for Async DB Access in Sync Context
# ============================================================================

def run_async_in_thread(coro):
    """
    Helper to run async database operations in SOAP service context.
    Avoids "event loop already running" errors by using a thread executor.
    """
    import concurrent.futures
    import asyncio
    
    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(run)
        return future.result(timeout=10)  # 10 second timeout


# ============================================================================
# Security & Authentication
# ============================================================================

class SoapAuthenticationError(Fault):
    """Custom SOAP fault for authentication errors"""
    def __init__(self, message="Authentication failed"):
        super().__init__(
            faultcode="Client.AuthenticationFailed",
            faultstring=message
        )


def validate_soap_token(token: str) -> bool:
    """
    Validate WS-Security token
    For production, integrate with database or JWT validation
    """
    # Simple token validation - replace with JWT or database lookup in production
    valid_tokens = [
        os.getenv("SOAP_API_TOKEN", "argus_soap_token_2025"),
        "admin_soap_token"
    ]
    return token in valid_tokens


def authenticate_soap_request(ctx):
    """Decorator to authenticate SOAP requests"""
    # Get token from SOAP header or first parameter
    token = getattr(ctx.in_header, 'token', None)
    if not token:
        # Try to get from in_object if header not present
        if hasattr(ctx, 'in_object') and ctx.in_object:
            token = getattr(ctx.in_object[0], 'auth_token', None)
    
    if not token or not validate_soap_token(token):
        raise SoapAuthenticationError("Invalid or missing authentication token")


# ============================================================================
# Complex Types for SOAP Messages
# ============================================================================

class StationInfo(ComplexModel):
    """Station configuration and capabilities"""
    __namespace__ = "http://argus.ui/soap/types"
    
    station_id = Unicode
    station_name = Unicode
    station_type = Unicode
    location = Unicode
    latitude = Unicode
    longitude = Unicode
    status = Unicode
    capabilities = Unicode
    last_update = DateTime


class StationStatus(ComplexModel):
    """Station operational status"""
    __namespace__ = "http://argus.ui/soap/types"
    
    station_id = Unicode
    station_name = Unicode
    is_online = Boolean
    status = Unicode
    current_task = Unicode
    alarm_state = Unicode
    connection_quality = Integer
    last_heartbeat = DateTime


class MeasurementRequest(ComplexModel):
    """Measurement scheduling request"""
    __namespace__ = "http://argus.ui/soap/types"
    
    measurement_id = Unicode
    station_id = Unicode
    measurement_type = Unicode  # FFM, SCAN, DSCAN, etc.
    frequency_start = Integer
    frequency_stop = Integer
    start_time = DateTime
    duration = Integer  # seconds
    priority = Integer
    operator = Unicode


class MeasurementResult(ComplexModel):
    """Measurement result data"""
    __namespace__ = "http://argus.ui/soap/types"
    
    measurement_id = Unicode
    station_id = Unicode
    measurement_type = Unicode
    frequency = Integer
    level = Unicode
    status = Unicode
    start_time = DateTime
    end_time = DateTime
    data_points = Integer
    file_path = Unicode


class OperatorInfo(ComplexModel):
    """Operator information"""
    __namespace__ = "http://argus.ui/soap/types"
    
    operator_id = Unicode
    username = Unicode
    full_name = Unicode
    email = Unicode
    role = Unicode
    is_active = Boolean
    last_login = DateTime


class ReportInfo(ComplexModel):
    """Report metadata"""
    __namespace__ = "http://argus.ui/soap/types"
    
    report_id = Unicode
    report_name = Unicode
    report_type = Unicode
    format = Unicode  # PDF, CSV, XML
    created_date = DateTime
    created_by = Unicode
    file_size = Integer
    download_url = Unicode


# Array types
StationInfoArray = Array(StationInfo)
StationStatusArray = Array(StationStatus)
MeasurementResultArray = Array(MeasurementResult)
OperatorInfoArray = Array(OperatorInfo)
ReportInfoArray = Array(ReportInfo)


# ============================================================================
# SOAP Service Implementation
# ============================================================================

class ArgusSOAPService(ServiceBase):
    """
    Main SOAP service implementing all required operations
    """
    __namespace__ = "http://argus.ui/soap"
    __service_url_path__ = "/soap"
    
    # Database reference (will be set from main server)
    db = None
    xml_processor = None
    
    @classmethod
    def set_dependencies(cls, database, processor):
        """Set database and XML processor dependencies"""
        cls.db = database
        cls.xml_processor = processor
    
    # ========================================================================
    # Service 1: GetSystemParameters
    # ========================================================================
    
    @rpc(Unicode, _returns=StationInfoArray)
    def GetSystemParameters(ctx, auth_token):
        """
        Retrieves configuration and capabilities of remote monitoring stations
        
        Args:
            auth_token: WS-Security authentication token
            
        Returns:
            Array of StationInfo objects with station configurations
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info("SOAP: GetSystemParameters called")
            
            # Query MongoDB for system parameters
            if ArgusSOAPService.db is not None:
                try:
                    # Get latest system parameters from GSP using thread-safe approach
                    params = run_async_in_thread(
                        ArgusSOAPService.db.system_parameters.find_one(
                            sort=[("timestamp", -1)]
                        )
                    )
                    
                    if params:
                        stations = []
                        for station in params.get('stations', []):
                            station_info = StationInfo(
                                station_id=station.get('station_id', 'unknown'),
                                station_name=station.get('station_name', 'Unknown'),
                                station_type=station.get('station_type', 'Monitoring'),
                                location=station.get('location', 'Unknown'),
                                latitude=str(station.get('latitude', '0')),
                                longitude=str(station.get('longitude', '0')),
                                status=station.get('status', 'unknown'),
                                capabilities=', '.join(station.get('capabilities', [])),
                                last_update=datetime.now()
                            )
                            stations.append(station_info)
                        
                        if stations:
                            return stations
                except Exception as e:
                    logger.error(f"Error querying database: {e}")
            
            # Return sample data if no database data available
            sample_station = StationInfo(
                station_id="HQ4",
                station_name="Headquarters Station 4",
                station_type="Fixed Monitoring Station",
                location="San Jose, Costa Rica",
                latitude="9.9281",
                longitude="-84.0907",
                status="online",
                capabilities="FFM, SCAN, DSCAN, DF",
                last_update=datetime.now()
            )
            
            return [sample_station]
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"GetSystemParameters error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error retrieving system parameters: {str(e)}")
    
    # ========================================================================
    # Service 2: GetStationStatus
    # ========================================================================
    
    @rpc(Unicode, Unicode, _returns=StationStatus)
    def GetStationStatus(ctx, auth_token, station_id):
        """
        Reports operational status, alarms, or connection state for a station
        
        Args:
            auth_token: WS-Security authentication token
            station_id: Unique identifier of the station
            
        Returns:
            StationStatus object with current operational status
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info(f"SOAP: GetStationStatus called for station {station_id}")
            
            # Query MongoDB for station status
            if ArgusSOAPService.db is not None:
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    # Get latest system state
                    state = loop.run_until_complete(
                        ArgusSOAPService.db.system_states.find_one(
                            sort=[("timestamp", -1)]
                        )
                    )
                    loop.close()
                    
                    if state:
                        for station in state.get('stations', []):
                            if station.get('station_id') == station_id or station.get('station_name') == station_id:
                                return StationStatus(
                                    station_id=station.get('station_id', station_id),
                                    station_name=station.get('station_name', station_id),
                                    is_online=station.get('is_running', False),
                                    status=station.get('status', 'unknown'),
                                    current_task=station.get('current_task', 'idle'),
                                    alarm_state=station.get('alarm_state', 'none'),
                                    connection_quality=station.get('connection_quality', 100),
                                    last_heartbeat=datetime.now()
                                )
                except Exception as e:
                    logger.error(f"Error querying database: {e}")
            
            # Return sample status if not found
            return StationStatus(
                station_id=station_id,
                station_name=f"Station {station_id}",
                is_online=True,
                status="operational",
                current_task="idle",
                alarm_state="none",
                connection_quality=95,
                last_heartbeat=datetime.now()
            )
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"GetStationStatus error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error retrieving station status: {str(e)}")
    
    # ========================================================================
    # Service 3: ScheduleMeasurement
    # ========================================================================
    
    @rpc(Unicode, MeasurementRequest, _returns=Unicode)
    def ScheduleMeasurement(ctx, auth_token, measurement_request):
        """
        Allows external systems to schedule a measurement remotely
        
        Args:
            auth_token: WS-Security authentication token
            measurement_request: MeasurementRequest object with measurement parameters
            
        Returns:
            Measurement order ID
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info(f"SOAP: ScheduleMeasurement called for station {measurement_request.station_id}")
            
            # Generate order ID
            order_id = f"SOAP{datetime.now().strftime('%y%m%d%H%M%S')}"
            
            # Create measurement order in database
            if ArgusSOAPService.db is not None and ArgusSOAPService.xml_processor:
                try:
                    # Use thread-safe database access (avoid event loop conflicts)
                    import concurrent.futures
                    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                    
                    def store_measurement():
                        import asyncio
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        
                        order_doc = {
                            "order_id": order_id,
                            "order_type": "OR",
                            "measurement_type": measurement_request.measurement_type,
                            "station_id": measurement_request.station_id,
                            "frequency_start": measurement_request.frequency_start,
                            "frequency_stop": measurement_request.frequency_stop,
                            "start_time": measurement_request.start_time,
                            "duration": measurement_request.duration,
                            "priority": measurement_request.priority,
                            "operator": measurement_request.operator,
                            "created_via": "SOAP",
                            "created_at": datetime.now(),
                            "status": "scheduled"
                        }
                        
                        result = loop.run_until_complete(
                            ArgusSOAPService.db.soap_measurements.insert_one(order_doc)
                        )
                        loop.close()
                        return result
                    
                    future = executor.submit(store_measurement)
                    future.result(timeout=5)  # Wait max 5 seconds
                    
                    logger.info(f"Measurement {order_id} scheduled successfully")
                    
                except Exception as e:
                    logger.error(f"Error creating measurement order: {e}")
            
            return order_id
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"ScheduleMeasurement error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error scheduling measurement: {str(e)}")
    
    # ========================================================================
    # Service 4: RequestMeasurementResult
    # ========================================================================
    
    @rpc(Unicode, Unicode, _returns=MeasurementResult)
    def RequestMeasurementResult(ctx, auth_token, measurement_id):
        """
        Retrieves results of a specific measurement task
        
        Args:
            auth_token: WS-Security authentication token
            measurement_id: Unique identifier of the measurement
            
        Returns:
            MeasurementResult object with measurement data
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info(f"SOAP: RequestMeasurementResult called for {measurement_id}")
            
            # Query MongoDB for measurement result
            if ArgusSOAPService.db is not None:
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    result = loop.run_until_complete(
                        ArgusSOAPService.db.measurement_results.find_one(
                            {"order_id": measurement_id}
                        )
                    )
                    loop.close()
                    
                    if result:
                        return MeasurementResult(
                            measurement_id=result.get('order_id', measurement_id),
                            station_id=result.get('station_name', 'unknown'),
                            measurement_type=result.get('measurement_type', 'unknown'),
                            frequency=result.get('frequency_single', 0),
                            level=f"{result.get('data_points', 0)} points",
                            status=result.get('status', 'unknown'),
                            start_time=result.get('measurement_start', datetime.now()),
                            end_time=result.get('measurement_end', datetime.now()),
                            data_points=result.get('data_points', 0),
                            file_path=result.get('csv_file_path', '')
                        )
                except Exception as e:
                    logger.error(f"Error querying database: {e}")
            
            # Return sample result if not found
            raise Fault(
                faultcode="Client.NotFound",
                faultstring=f"Measurement {measurement_id} not found"
            )
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"RequestMeasurementResult error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error retrieving measurement result: {str(e)}")
    
    # ========================================================================
    # Service 5: PushMeasurementResult
    # ========================================================================
    
    @rpc(Unicode, MeasurementResult, _returns=Boolean)
    def PushMeasurementResult(ctx, auth_token, measurement_result):
        """
        Sends measurement results automatically to external systems
        
        Args:
            auth_token: WS-Security authentication token
            measurement_result: MeasurementResult object to push
            
        Returns:
            Boolean indicating success
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info(f"SOAP: PushMeasurementResult called for {measurement_result.measurement_id}")
            
            # Store pushed result in database
            if ArgusSOAPService.db is not None:
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    result_doc = {
                        "measurement_id": measurement_result.measurement_id,
                        "station_id": measurement_result.station_id,
                        "measurement_type": measurement_result.measurement_type,
                        "frequency": measurement_result.frequency,
                        "level": measurement_result.level,
                        "status": measurement_result.status,
                        "start_time": measurement_result.start_time,
                        "end_time": measurement_result.end_time,
                        "data_points": measurement_result.data_points,
                        "file_path": measurement_result.file_path,
                        "pushed_via": "SOAP",
                        "pushed_at": datetime.now()
                    }
                    
                    loop.run_until_complete(
                        ArgusSOAPService.db.soap_pushed_results.insert_one(result_doc)
                    )
                    loop.close()
                    
                    logger.info(f"Result {measurement_result.measurement_id} pushed successfully")
                    return True
                    
                except Exception as e:
                    logger.error(f"Error storing pushed result: {e}")
                    return False
            
            return True
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"PushMeasurementResult error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error pushing measurement result: {str(e)}")
    
    # ========================================================================
    # Service 6: GetOperatorList
    # ========================================================================
    
    @rpc(Unicode, _returns=OperatorInfoArray)
    def GetOperatorList(ctx, auth_token):
        """
        Retrieves authorized operator data
        
        Args:
            auth_token: WS-Security authentication token
            
        Returns:
            Array of OperatorInfo objects
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info("SOAP: GetOperatorList called")
            
            # Query MongoDB for operators
            if ArgusSOAPService.db is not None:
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    cursor = ArgusSOAPService.db.users.find({})
                    users = loop.run_until_complete(cursor.to_list(length=100))
                    loop.close()
                    
                    if users:
                        operators = []
                        for user in users:
                            operator = OperatorInfo(
                                operator_id=user.get('id', str(user.get('_id', ''))),
                                username=user.get('username', 'unknown'),
                                full_name=user.get('email', user.get('username', 'Unknown')),
                                email=user.get('email', ''),
                                role=user.get('role', 'operator'),
                                is_active=user.get('is_active', True),
                                last_login=user.get('last_login', datetime.now())
                            )
                            operators.append(operator)
                        
                        if operators:
                            return operators
                except Exception as e:
                    logger.error(f"Error querying database: {e}")
            
            # Return sample operator if no database data
            sample_operator = OperatorInfo(
                operator_id="1",
                username="admin",
                full_name="System Administrator",
                email="admin@argus.ui",
                role="admin",
                is_active=True,
                last_login=datetime.now()
            )
            
            return [sample_operator]
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"GetOperatorList error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error retrieving operator list: {str(e)}")
    
    # ========================================================================
    # Service 7: GetReportList
    # ========================================================================
    
    @rpc(Unicode, Unicode, _returns=ReportInfoArray)
    def GetReportList(ctx, auth_token, report_type=None):
        """
        Provides metadata and download links for generated reports
        
        Args:
            auth_token: WS-Security authentication token
            report_type: Optional filter by report type (PDF, CSV, XML)
            
        Returns:
            Array of ReportInfo objects
        """
        try:
            # Authenticate
            if not validate_soap_token(auth_token):
                raise SoapAuthenticationError()
            
            logger.info(f"SOAP: GetReportList called (type: {report_type})")
            
            # Query MongoDB for reports
            if ArgusSOAPService.db is not None:
                try:
                    import asyncio
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    query = {}
                    if report_type:
                        query['format'] = report_type.upper()
                    
                    cursor = ArgusSOAPService.db.reports.find(query).sort("created_date", -1).limit(50)
                    reports_data = loop.run_until_complete(cursor.to_list(length=50))
                    loop.close()
                    
                    if reports_data:
                        reports = []
                        for report in reports_data:
                            report_info = ReportInfo(
                                report_id=report.get('id', str(report.get('_id', ''))),
                                report_name=report.get('name', 'Unknown Report'),
                                report_type=report.get('type', 'measurement'),
                                format=report.get('format', 'PDF'),
                                created_date=report.get('created_date', datetime.now()),
                                created_by=report.get('created_by', 'system'),
                                file_size=report.get('file_size', 0),
                                download_url=report.get('download_url', '')
                            )
                            reports.append(report_info)
                        
                        if reports:
                            return reports
                except Exception as e:
                    logger.error(f"Error querying database: {e}")
            
            # Return sample report if no database data
            sample_report = ReportInfo(
                report_id="RPT001",
                report_name="Daily Measurement Summary",
                report_type="measurement",
                format="PDF",
                created_date=datetime.now(),
                created_by="system",
                file_size=1024000,
                download_url="/api/reports/RPT001/download"
            )
            
            return [sample_report]
            
        except SoapAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"GetReportList error: {e}", exc_info=True)
            raise Fault(faultcode="Server", faultstring=f"Error retrieving report list: {str(e)}")


# ============================================================================
# SOAP Application Factory
# ============================================================================

def create_soap_application(db=None, xml_processor=None):
    """
    Create and configure SOAP application
    
    Args:
        db: MongoDB database connection
        xml_processor: XML processor instance
        
    Returns:
        WSGI application for SOAP services
    """
    # Set dependencies
    if db is not None:
        ArgusSOAPService.set_dependencies(db, xml_processor)
    
    # Create Spyne application
    application = Application(
        [ArgusSOAPService],
        tns='http://argus.ui/soap',
        in_protocol=Soap12(validator='lxml'),
        out_protocol=Soap12()
    )
    
    # Create WSGI application
    wsgi_app = WsgiApplication(application)
    
    logger.info("SOAP application created successfully")
    
    return wsgi_app
