from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import asyncio
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

# Import our models and utilities
from models import (
    User, UserCreate, UserRole, 
    ArgusOrder, OrderType, SubOrderTask, ResultType,
    ArgusSystemState, MeasurementConfig, DirectMeasurementRequest,
    SystemLog, ApiResponse, SystemStatusResponse
)
from xml_processor import ArgusXMLProcessor
from auth import AuthManager, get_current_user, require_admin
import auth as auth_module
from data_navigator_api import create_data_navigator_router
from amm_api import create_amm_router
from amm_scheduler import AMMScheduler

# Configuration
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Argus XML processor (will be configured via environment or API)
xml_processor: Optional[ArgusXMLProcessor] = None

# AMM Scheduler
amm_scheduler: Optional[AMMScheduler] = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# BACKGROUND TASKS
# ============================================================================

async def startup_gss_request():
    """Send initial GSS request on startup (one-time)"""
    try:
        # Check if we have recent system state (less than 1 hour old)
        latest_state = await db.system_states.find_one(sort=[("timestamp", -1)])
        
        should_request = False
        if not latest_state:
            should_request = True
            logger.info("No system state found, requesting initial GSS")
        else:
            time_diff = datetime.now() - latest_state.get("timestamp", datetime.min)
            if time_diff.total_seconds() > 3600:  # 1 hour
                should_request = True
                logger.info(f"Last system state is {time_diff.total_seconds()}s old, requesting new GSS")
        
        if should_request:
            # Generate and save GSS request
            control_station = os.getenv("ARGUS_CONTROL_STATION", "HQ4")
            sender_pc = os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
            
            order_id = xml_processor.generate_order_id("GSS")
            xml_content = xml_processor.create_system_state_request(order_id, sender=control_station, sender_pc=sender_pc)
            xml_file = xml_processor.save_request(xml_content, order_id)
            
            # Create order record
            order = ArgusOrder(
                order_id=order_id,
                order_type=OrderType.GSS,
                order_name="Startup System State Query",
                created_by="system",
                xml_request_file=xml_file
            )
            await db.argus_orders.insert_one(order.dict())
            logger.info(f"Startup GSS request sent: {order_id}")
            
    except Exception as e:
        logger.error(f"Error in startup GSS request: {e}")

# ============================================================================
# APPLICATION LIFECYCLE
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting ArgusUI Backend...")
    
    # Initialize auth manager
    auth_module.auth_manager = AuthManager(db)
    await auth_module.auth_manager.create_default_admin()
    
    # Initialize XML processor with default paths (can be overridden via API)
    global xml_processor, amm_scheduler, file_watcher
    inbox_path = os.getenv("ARGUS_INBOX_PATH", "/tmp/argus_inbox")
    outbox_path = os.getenv("ARGUS_OUTBOX_PATH", "/tmp/argus_outbox")
    data_path = os.getenv("ARGUS_DATA_PATH", "/tmp/argus_data")
    
    xml_processor = ArgusXMLProcessor(inbox_path, outbox_path, data_path)
    logger.info(f"XML Processor initialized - Inbox: {inbox_path}, Outbox: {outbox_path}")
    
    # Initialize AMM scheduler
    amm_scheduler = AMMScheduler(db, xml_processor)
    logger.info("AMM Scheduler initialized")
    
    # Create and include AMM router now that scheduler is available
    global amm_router
    amm_router = create_amm_router(db, amm_scheduler)
    app.include_router(amm_router)
    logger.info("AMM Router initialized and included")
    
    # Initialize and include SMDI router
    import smdi_api
    smdi_api.set_dependencies(xml_processor, db)
    app.include_router(smdi_api.router, prefix="/api", tags=["SMDI"])
    logger.info("SMDI Router initialized and included")
    
    # Initialize Reports Module
    import reports_api
    from report_generator import ReportGenerator
    report_generator = ReportGenerator()
    reports_api.set_dependencies(db, report_generator)
    app.include_router(reports_api.router, prefix="/api", tags=["Reports"])
    logger.info("Reports Module initialized")
    
    # Initialize System Logs API
    import system_logs_api
    app.include_router(system_logs_api.router, prefix="/api", tags=["System Logs"])
    logger.info("System Logs API initialized")
    
    # Initialize SOAP Web Services (Optional - requires Python 3.11/3.12)
    global soap_app
    try:
        from soap_gateway import create_soap_application
        soap_app = create_soap_application(db, xml_processor)
        logger.info("SOAP Web Services initialized at /soap endpoint")
        logger.info("WSDL available at /wsdl and /wsdl/ArgusUI.wsdl")
    except ImportError as e:
        soap_app = None
        logger.warning("=" * 70)
        logger.warning("SOAP Web Services NOT AVAILABLE")
        logger.warning(f"Reason: {e}")
        logger.warning("SOAP services require Python 3.11 or 3.12 (spyne compatibility issue)")
        logger.warning("All other features (Reports, SMDI, AMM, etc.) will work normally")
        logger.warning("To enable SOAP: Use Python 3.11 or 3.12 and reinstall dependencies")
        logger.warning("=" * 70)
    
    # Start AMM scheduler
    await amm_scheduler.start_scheduler()
    logger.info("AMM Scheduler started")
    
    # Initialize File Watcher for outbox monitoring with event loop
    from file_watcher import ArgusFileWatcher
    loop = asyncio.get_event_loop()
    file_watcher = ArgusFileWatcher(outbox_path, xml_processor, db, loop)
    file_watcher.start()
    logger.info("File watcher started for outbox monitoring")
    
    # Process any existing response files
    await file_watcher.process_existing_files()
    
    # Send initial GSS request on startup
    await startup_gss_request()
    
    yield
    
    # Shutdown
    logger.info("Shutting down ArgusUI Backend...")
    
    # Stop AMM scheduler
    if amm_scheduler:
        await amm_scheduler.stop_scheduler()
        logger.info("AMM Scheduler stopped")
    
    # Stop file watcher
    file_watcher.stop()
    client.close()

# Create FastAPI app
app = FastAPI(
    title="ArgusUI Backend",
    description="Web interface for R&S Argus spectrum monitoring system",
    version="1.0.0",
    lifespan=lifespan
)

# ============================================================================
# SOAP WEB SERVICES
# ============================================================================

from fastapi.responses import Response
from soap_gateway import create_soap_application

# SOAP application (will be initialized in lifespan)
soap_app = None

@app.api_route("/soap", methods=["GET", "POST"])
async def soap_endpoint(request: Request):
    """
    SOAP 1.2 endpoint for external system interoperability
    Handles all SOAP requests and returns SOAP responses
    
    Note: Requires Python 3.11 or 3.12 (spyne compatibility)
    """
    global soap_app
    
    if soap_app is None:
        return Response(
            content="""<?xml version="1.0" encoding="UTF-8"?>
<error>
    <message>SOAP Web Services are not available</message>
    <reason>Requires Python 3.11 or 3.12 (spyne compatibility issue with Python 3.13)</reason>
    <solution>Use Python 3.11/3.12 and run: pip install spyne zeep lxml</solution>
    <note>All other ArgusUI features are fully functional</note>
</error>""",
            media_type="text/xml",
            status_code=503
        )
    
    # Convert FastAPI request to WSGI environ
    scope = request.scope
    environ = {
        'REQUEST_METHOD': scope['method'],
        'SCRIPT_NAME': '',
        'PATH_INFO': scope['path'],
        'QUERY_STRING': scope.get('query_string', b'').decode('latin1'),
        'CONTENT_TYPE': request.headers.get('content-type', ''),
        'CONTENT_LENGTH': request.headers.get('content-length', ''),
        'SERVER_NAME': scope.get('server', ['localhost', None])[0],
        'SERVER_PORT': str(scope.get('server', [None, 80])[1]),
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': scope.get('scheme', 'http'),
        'wsgi.input': await request.body(),
        'wsgi.errors': None,
        'wsgi.multithread': True,
        'wsgi.multiprocess': False,
        'wsgi.run_once': False,
    }
    
    # Add HTTP headers
    for header_name, header_value in request.headers.items():
        key = f'HTTP_{header_name.upper().replace("-", "_")}'
        environ[key] = header_value
    
    # Call SOAP application
    response_started = False
    status_code = 200
    response_headers = []
    response_body = []
    
    def start_response(status, headers):
        nonlocal response_started, status_code, response_headers
        response_started = True
        status_code = int(status.split()[0])
        response_headers = headers
    
    # Get response from SOAP app
    import io
    environ['wsgi.input'] = io.BytesIO(environ['wsgi.input'])
    
    result = soap_app(environ, start_response)
    
    for data in result:
        response_body.append(data)
    
    # Return response
    content = b''.join(response_body)
    headers_dict = {name: value for name, value in response_headers}
    
    return Response(
        content=content,
        status_code=status_code,
        headers=headers_dict,
        media_type=headers_dict.get('Content-Type', 'text/xml')
    )

@app.get("/wsdl")
@app.get("/wsdl/ArgusUI.wsdl")
async def get_wsdl():
    """
    Retrieve WSDL (Web Services Description Language) for ArgusUI SOAP services
    
    Note: Requires Python 3.11 or 3.12 (spyne compatibility)
    """
    global soap_app
    
    if soap_app is None:
        return Response(
            content="""<?xml version="1.0" encoding="UTF-8"?>
<error>
    <message>SOAP WSDL is not available</message>
    <reason>Requires Python 3.11 or 3.12 (spyne compatibility issue with Python 3.13)</reason>
    <solution>Use Python 3.11/3.12 and run: pip install spyne zeep lxml</solution>
    <documentation>See SOAP_WEB_SERVICES_DOCUMENTATION.md for details</documentation>
</error>""",
            media_type="text/xml",
            status_code=503
        )
    
    # Generate WSDL by making a GET request to SOAP endpoint
    from starlette.requests import Request
    
    wsdl_request_env = {
        'REQUEST_METHOD': 'GET',
        'SCRIPT_NAME': '',
        'PATH_INFO': '/soap',
        'QUERY_STRING': 'wsdl',
        'SERVER_NAME': 'localhost',
        'SERVER_PORT': '8001',
        'wsgi.url_scheme': 'http',
    }
    
    response_data = []
    
    def start_response(status, headers):
        pass
    
    result = soap_app(wsdl_request_env, start_response)
    for data in result:
        response_data.append(data)
    
    wsdl_content = b''.join(response_data)
    
    return Response(
        content=wsdl_content,
        media_type="text/xml",
        headers={"Content-Disposition": "inline; filename=ArgusUI.wsdl"}
    )

# Create API router with prefix
api_router = APIRouter(prefix="/api")

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Authenticate user and return JWT token"""
    user = await auth_module.auth_manager.authenticate_user(
        credentials.username, credentials.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=auth_module.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_module.auth_manager.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@api_router.post("/auth/users", response_model=User)
async def create_user(user_data: UserCreate, admin_user: User = Depends(require_admin)):
    """Create new user (admin only)"""
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create user
    user_dict = user_data.dict(exclude={"password"})
    user_dict["password_hash"] = auth_module.auth_manager.get_password_hash(user_data.password)
    user_dict["created_at"] = datetime.utcnow()
    
    user = User(**user_dict)
    await db.users.insert_one(user.dict())
    
    return user

# ============================================================================
# SYSTEM STATUS ENDPOINTS
# ============================================================================

@api_router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status(current_user: User = Depends(get_current_user)):
    """Get current Argus system status"""
    try:
        # Check for recent responses in outbox
        responses = xml_processor.check_responses()
        
        system_state_data = None
        
        # Process any new GSS responses
        for response in responses:
            if response.get("order_type") == "GSS" and response.get("order_state") == "Finished":
                system_state_data = response
                
                # Update order record
                await db.argus_orders.update_one(
                    {"order_id": response["order_id"]},
                    {"$set": {
                        "order_state": "Finished",
                        "xml_response_file": response.get("xml_file"),
                        "updated_at": datetime.now()
                    }}
                )
                
                # Save system state to database
                system_state = ArgusSystemState(
                    is_running=response.get("is_running", False),
                    current_user=response.get("current_user", ""),
                    monitoring_time=response.get("monitoring_time", 0),
                    stations=response.get("stations", []),
                    devices=response.get("devices", [])
                )
                await db.system_states.insert_one(system_state.dict())
                break
        
        # If no new response, get most recent from database
        if not system_state_data:
            latest_state = await db.system_states.find_one(sort=[("timestamp", -1)])
            if latest_state:
                system_state_data = latest_state
            else:
                # No data yet, generate a new request
                control_station = os.getenv("ARGUS_CONTROL_STATION", "HQ4")
                sender_pc = os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
                
                order_id = xml_processor.generate_order_id("GSS")
                xml_content = xml_processor.create_system_state_request(order_id, sender=control_station, sender_pc=sender_pc)
                xml_file = xml_processor.save_request(xml_content, order_id)
                
                order = ArgusOrder(
                    order_id=order_id,
                    order_type=OrderType.GSS,
                    order_name="System State Query",
                    created_by=current_user.id,
                    xml_request_file=xml_file
                )
                await db.argus_orders.insert_one(order.dict())
                
                # Return empty state indicating waiting for response
                return SystemStatusResponse(
                    argus_running=False,
                    last_update=datetime.now(),
                    active_measurements=0,
                    system_health="Waiting for Argus response...",
                    stations=[],
                    devices=[]
                )
        
        # Count active measurements
        active_measurements = await db.argus_orders.count_documents({
            "order_state": {"$in": ["Open", "In Process"]}
        })
        
        # Count stations with active modes
        online_stations = system_state_data.get("online_stations", 0)
        total_stations = system_state_data.get("total_stations", 0)
        
        return SystemStatusResponse(
            argus_running=system_state_data.get("is_running", False),
            last_update=system_state_data.get("timestamp", datetime.now()),
            active_measurements=active_measurements,
            system_health=f"{online_stations}/{total_stations} stations online" if total_stations > 0 else "No data",
            stations=system_state_data.get("stations", []),
            devices=system_state_data.get("devices", [])
        )
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system status: {str(e)}"
        )

@api_router.post("/system/request-parameters")
async def request_system_parameters_alt(current_user: User = Depends(get_current_user)):
    """Request Argus system parameters (GSP) - alternative endpoint"""
    try:
        # Get control station configuration from environment
        control_station = os.getenv("ARGUS_CONTROL_STATION", "HQ4")
        sender_pc = os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
        
        order_id = xml_processor.generate_order_id("GSP")
        xml_content = xml_processor.create_system_params_request(order_id, sender=control_station, sender_pc=sender_pc)
        xml_file = xml_processor.save_request(xml_content, order_id)
        
        order = ArgusOrder(
            order_id=order_id,
            order_type=OrderType.GSP,
            order_name="System Parameters Query",
            created_by=current_user.id,
            xml_request_file=xml_file
        )
        await db.argus_orders.insert_one(order.dict())
        
        return ApiResponse(
            success=True,
            message="System parameters request sent",
            data={"order_id": order_id}
        )
        
    except Exception as e:
        logger.error(f"Error requesting system parameters: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to request system parameters: {str(e)}"
        )

@api_router.get("/system/available-stations")
async def get_available_stations(current_user: User = Depends(get_current_user)):
    """Get list of available online stations with their devices and capabilities for AMM configuration"""
    try:
        # Get the most recent system state from database
        latest_state = await db.system_states.find_one(sort=[("timestamp", -1)])
        
        if not latest_state:
            return ApiResponse(
                success=True,
                message="No system state available yet. Please wait for GSS response.",
                data={"stations": []}
            )
        
        # Filter only online stations and format for AMM
        available_stations = []
        for station in latest_state.get("stations", []):
            if station.get("running"):  # Only include online stations
                station_info = {
                    "name": station.get("name"),
                    "pc": station.get("pc"),
                    "type": station.get("type"),
                    "device_count": station.get("device_count", 0),
                    "devices": station.get("devices", []),
                    "coordinates": {
                        "latitude": station.get("latitude", 0),
                        "longitude": station.get("longitude", 0)
                    },
                    # Available measurement types based on devices
                    "available_measurement_types": _get_measurement_types_for_station(station.get("devices", []))
                }
                available_stations.append(station_info)
        
        return ApiResponse(
            success=True,
            message=f"Found {len(available_stations)} online stations",
            data={"stations": available_stations}
        )
        
    except Exception as e:
        logger.error(f"Error getting available stations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available stations: {str(e)}"
        )

@api_router.post("/system/request-gss")
async def request_system_state(current_user: User = Depends(get_current_user)):
    """Manually request system state (GSS) from Argus"""
    try:
        # Get control station configuration from environment
        control_station = os.getenv("ARGUS_CONTROL_STATION", "HQ4")
        sender_pc = os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
        
        # Generate GSS request
        order_id = xml_processor.generate_order_id("GSS")
        xml_content = xml_processor.create_system_state_request(order_id, sender=control_station, sender_pc=sender_pc)
        
        # Save request
        xml_file = xml_processor.save_request(xml_content, order_id)
        
        # Create order record
        order = ArgusOrder(
            order_id=order_id,
            order_type=OrderType.GSS,
            order_name="Manual System State Query",
            created_by=current_user.id,
            xml_request_file=xml_file
        )
        await db.argus_orders.insert_one(order.dict())
        
        logger.info(f"Manual GSS request sent: {order_id}")
        
        return ApiResponse(
            success=True,
            message="GSS request sent to Argus. Response will be processed automatically.",
            data={
                "order_id": order_id,
                "xml_file": xml_file
            }
        )
        
    except Exception as e:
        logger.error(f"Error sending GSS request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send GSS request: {str(e)}"
        )

@api_router.post("/system/request-gsp")
async def request_system_parameters(current_user: User = Depends(get_current_user)):
    """Manually request system parameters (GSP) from Argus to get signal paths and device details"""
    try:
        # Get control station configuration from environment
        control_station = os.getenv("ARGUS_CONTROL_STATION", "HQ4")
        sender_pc = os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
        
        # Generate GSP request
        order_id = xml_processor.generate_order_id("GSP")
        xml_content = xml_processor.create_system_params_request(order_id, sender=control_station, sender_pc=sender_pc)
        
        # Save request
        xml_file = xml_processor.save_request(xml_content, order_id)
        
        # Create order record
        order = ArgusOrder(
            order_id=order_id,
            order_type=OrderType.GSP,
            order_name="Manual System Parameters Query",
            created_by=current_user.id,
            xml_request_file=xml_file
        )
        await db.argus_orders.insert_one(order.dict())
        
        logger.info(f"Manual GSP request sent: {order_id}")
        
        return ApiResponse(
            success=True,
            message="GSP request sent to Argus. Response will be processed automatically and signal paths will be available.",
            data={
                "order_id": order_id,
                "xml_file": xml_file
            }
        )
        
    except Exception as e:
        logger.error(f"Error sending GSP request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send GSP request: {str(e)}"
        )

@api_router.get("/system/signal-paths")
async def get_signal_paths(
    station_name: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get available signal paths from the most recent GSP response"""
    try:
        # Get the most recent GSP response from system_parameters collection
        latest_gsp = await db.system_parameters.find_one(
            {"parameter_type": "GSP"},
            sort=[("timestamp", -1)]
        )
        
        if not latest_gsp:
            return ApiResponse(
                success=True,
                message="No GSP data available. Please request system parameters first.",
                data={
                    "signal_paths": [],
                    "stations": []
                }
            )
        
        signal_paths = latest_gsp.get("signal_paths", [])
        stations = latest_gsp.get("stations", [])
        
        # Filter by station if specified
        if station_name:
            signal_paths = [sp for sp in signal_paths if sp.get("station") == station_name]
            stations = [st for st in stations if st.get("name") == station_name]
        
        return ApiResponse(
            success=True,
            message=f"Found {len(signal_paths)} signal paths",
            data={
                "signal_paths": signal_paths,
                "stations": stations,
                "timestamp": latest_gsp.get("timestamp")
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting signal paths: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get signal paths: {str(e)}"
        )

@api_router.get("/system/parameters")
async def get_system_parameters(current_user: User = Depends(get_current_user)):
    """Get the most recent system parameters (GSP) data for display"""
    try:
        # Get the most recent GSP response
        latest_gsp = await db.system_parameters.find_one(
            {"parameter_type": "GSP"},
            sort=[("timestamp", -1)]
        )
        
        if not latest_gsp:
            return ApiResponse(
                success=False,
                message="No GSP data available. Please request system parameters first.",
                data=None
            )
        
        # Format the response
        stations = latest_gsp.get("stations", [])
        signal_paths = latest_gsp.get("signal_paths", [])
        
        return ApiResponse(
            success=True,
            message=f"System parameters retrieved: {len(stations)} stations, {len(signal_paths)} signal paths",
            data={
                "timestamp": latest_gsp.get("timestamp"),
                "order_id": latest_gsp.get("order_id"),
                "stations": stations,
                "signal_paths": signal_paths,
                "total_stations": len(stations),
                "total_signal_paths": len(signal_paths)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting system parameters: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system parameters: {str(e)}"
        )
        latest_gsp = await db.system_parameters.find_one(
            {"parameter_type": "GSP"},
            sort=[("timestamp", -1)]
        )
        
        if not latest_gsp:
            return ApiResponse(
                success=True,
                message="No GSP data available. Please request system parameters first.",
                data={
                    "signal_paths": [],
                    "stations": []
                }
            )
        
        signal_paths = latest_gsp.get("signal_paths", [])
        stations = latest_gsp.get("stations", [])
        
        # Filter by station if specified
        if station_name:
            signal_paths = [sp for sp in signal_paths if sp.get("station") == station_name]
            stations = [st for st in stations if st.get("name") == station_name]
        
        return ApiResponse(
            success=True,
            message=f"Found {len(signal_paths)} signal paths",
            data={
                "signal_paths": signal_paths,
                "stations": stations,
                "timestamp": latest_gsp.get("timestamp")
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting signal paths: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get signal paths: {str(e)}"
        )

def _get_measurement_types_for_station(devices: list) -> list:
    """Determine available measurement types based on station's devices"""
    measurement_types = set()
    
    # Map device drivers to measurement capabilities
    driver_capabilities = {
        "EB500": ["FFM", "SCAN", "DSCAN", "LOCATION"],
        "DDF550": ["FFM", "SCAN", "DSCAN"],
        "ANTENNA08": ["FFM", "SCAN"],
        "ZS12x": ["FFM", "SCAN"],
        "S_UMS300": ["FFM", "SCAN", "PSCAN"],
        "AU600Ctrl": ["FFM", "SCAN"],
        "EM100": ["FFM", "SCAN"]
    }
    
    for device in devices:
        driver = device.get("driver", "")
        if driver in driver_capabilities:
            measurement_types.update(driver_capabilities[driver])
    
    # If no specific capabilities found, provide basic types
    if not measurement_types:
        measurement_types = ["FFM", "SCAN"]
    
    return sorted(list(measurement_types))

# ============================================================================
# DIRECT MEASUREMENT ENDPOINTS
# ============================================================================

@api_router.post("/measurements/direct")
async def start_direct_measurement(request: DirectMeasurementRequest, 
                                 current_user: User = Depends(get_current_user)):
    """Start a direct measurement"""
    try:
        # Get configuration
        config = {}
        if request.config_id:
            config_doc = await db.measurement_configs.find_one({"id": request.config_id})
            if config_doc:
                config = MeasurementConfig(**config_doc).dict()
        elif request.custom_config:
            config = request.custom_config
        
        # Build measurement parameters
        meas_params = {
            "name": request.measurement_name,
            "task": request.suborder_task.value,
            "result_type": request.result_type.value,
            "suborder_name": request.measurement_name
        }
        
        # Add frequency parameters
        if config.get("freq_mode"):
            meas_params["freq_mode"] = config["freq_mode"]
            if config["freq_mode"] == "S":
                meas_params["freq_single"] = config.get("freq_single")
            elif config["freq_mode"] == "R":
                meas_params["freq_range_low"] = config.get("freq_range_low")
                meas_params["freq_range_high"] = config.get("freq_range_high")
                meas_params["freq_step"] = config.get("freq_step")
            elif config["freq_mode"] == "L":
                meas_params["freq_list"] = config.get("freq_list", [])
        
        # Add other parameters
        for param in ["if_bandwidth", "rf_attenuation", "demodulation", "measurement_time"]:
            if config.get(param):
                meas_params[param] = config[param]
        
        # Generate order
        order_id = xml_processor.generate_order_id("MEAS")
        xml_content = xml_processor.create_measurement_order(order_id, meas_params)
        xml_file = xml_processor.save_request(xml_content, order_id)
        
        # Create order record
        order = ArgusOrder(
            order_id=order_id,
            order_type=OrderType.OR,
            order_name=request.measurement_name,
            suborder_task=request.suborder_task,
            result_type=request.result_type,
            created_by=current_user.id,
            xml_request_file=xml_file,
            parameters=meas_params
        )
        await db.argus_orders.insert_one(order.dict())
        
        return ApiResponse(
            success=True,
            message="Measurement started",
            data={"order_id": order_id, "order": order.dict()}
        )
        
    except Exception as e:
        logger.error(f"Error starting measurement: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start measurement: {str(e)}"
        )

@api_router.get("/measurements/orders")
async def get_measurement_orders(current_user: User = Depends(get_current_user)):
    """Get measurement orders"""
    orders = await db.argus_orders.find().sort("created_at", -1).limit(50).to_list(50)
    return [ArgusOrder(**order) for order in orders]

@api_router.get("/measurements/orders/{order_id}")
async def get_measurement_order(order_id: str, current_user: User = Depends(get_current_user)):
    """Get specific measurement order"""
    order_doc = await db.argus_orders.find_one({"order_id": order_id})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return ArgusOrder(**order_doc)

# ============================================================================
# CONFIGURATION ENDPOINTS
# ============================================================================

@api_router.post("/config/measurements", response_model=MeasurementConfig)
async def create_measurement_config(config: MeasurementConfig, 
                                  current_user: User = Depends(get_current_user)):
    """Create measurement configuration template"""
    config.created_by = current_user.id
    await db.measurement_configs.insert_one(config.dict())
    return config

@api_router.get("/config/measurements", response_model=List[MeasurementConfig])
async def get_measurement_configs(current_user: User = Depends(get_current_user)):
    """Get measurement configuration templates"""
    configs = await db.measurement_configs.find().to_list(100)
    return [MeasurementConfig(**config) for config in configs]

@api_router.delete("/config/measurements/{template_id}")
async def delete_measurement_config(template_id: str, current_user: User = Depends(get_current_user)):
    """Delete measurement configuration template"""
    result = await db.measurement_configs.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return ApiResponse(success=True, message="Template deleted successfully")

@api_router.get("/auth/users", response_model=List[User])
async def get_users(admin_user: User = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find().to_list(100)
    return [User(**user) for user in users]

# ============================================================================
# SYSTEM LOGS ENDPOINTS
# ============================================================================

@api_router.get("/logs", response_model=List[SystemLog])
async def get_system_logs(limit: int = 100, level: Optional[str] = None,
                         current_user: User = Depends(get_current_user)):
    """Get system logs"""
    query = {}
    if level:
        query["level"] = level
    
    logs = await db.system_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [SystemLog(**log) for log in logs]

async def log_system_event(level: str, source: str, message: str, 
                          user_id: Optional[str] = None, order_id: Optional[str] = None,
                          details: Optional[dict] = None):
    """Helper function to log system events"""
    log_entry = SystemLog(
        level=level,
        source=source,
        message=message,
        user_id=user_id,
        order_id=order_id,
        details=details
    )
    await db.system_logs.insert_one(log_entry.dict())

# ============================================================================
# BACKGROUND TASKS (Response Processing)
# ============================================================================

@api_router.post("/system/process-responses")
async def process_xml_responses(admin_user: User = Depends(require_admin)):
    """Process pending XML responses from Argus (admin only)"""
    try:
        responses = xml_processor.check_responses()
        processed_count = 0
        
        for response in responses:
            order_id = response.get("order_id")
            if order_id:
                # Update order in database
                update_data = {
                    "order_state": response.get("order_state", "Finished"),
                    "completed_at": datetime.utcnow(),
                    "xml_response_file": response.get("xml_file")
                }
                
                if response.get("error"):
                    update_data["error_message"] = response["error"].get("message")
                
                await db.argus_orders.update_one(
                    {"order_id": order_id},
                    {"$set": update_data}
                )
                
                # Save system state if GSS response
                if response.get("order_type") == "GSS":
                    system_state = ArgusSystemState(
                        is_running=response.get("is_running", False),
                        current_user=response.get("current_user"),
                        monitoring_time=response.get("monitoring_time"),
                        stations=response.get("stations", []),
                        devices=response.get("devices", []),
                        raw_xml_file=response.get("xml_file")
                    )
                    await db.system_states.insert_one(system_state.dict())
                
                processed_count += 1
        
        return ApiResponse(
            success=True,
            message=f"Processed {processed_count} responses",
            data={"processed_count": processed_count}
        )
        
    except Exception as e:
        logger.error(f"Error processing responses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process responses: {str(e)}"
        )



# ============================================================================
# CALENDAR VIEW ENDPOINTS
# ============================================================================

@api_router.get("/amm/calendar-events")
async def get_amm_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get AMM executions for calendar view with color coding"""
    try:
        # Parse dates
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        else:
            start_dt = datetime.now() - timedelta(days=30)
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
        else:
            end_dt = datetime.now() + timedelta(days=30)
        
        # Query executions within date range
        query = {
            "scheduled_time": {
                "$gte": start_dt,
                "$lte": end_dt
            }
        }
        
        executions_cursor = db.amm_executions.find(query).sort("scheduled_time", 1)
        executions = await executions_cursor.to_list(length=1000)
        
        # Get all AMM configurations for reference
        configs_cursor = db.amm_configurations.find()
        configs = await configs_cursor.to_list(length=None)
        configs_dict = {c["id"]: c for c in configs}
        
        # Transform to calendar events
        calendar_events = []
        for execution in executions:
            config_id = execution.get("amm_config_id")
            config = configs_dict.get(config_id, {})
            
            # Determine color based on status
            status = execution.get("status", "pending")
            if status == "completed":
                color = "#10b981"  # Green
            elif status in ["running", "in_progress"]:
                color = "#f59e0b"  # Yellow/Orange
            elif status in ["failed", "error"]:
                color = "#ef4444"  # Red
            else:
                color = "#6366f1"  # Blue (pending)
            
            # Create event
            event = {
                "id": execution.get("id"),
                "title": config.get("name", "AMM Execution"),
                "start": execution.get("scheduled_time").isoformat() if execution.get("scheduled_time") else None,
                "end": execution.get("actual_end_time").isoformat() if execution.get("actual_end_time") else None,
                "status": status,
                "color": color,
                "amm_config_id": config_id,
                "amm_name": config.get("name"),
                "measurements_performed": execution.get("measurements_performed", 0),
                "generated_orders": execution.get("generated_orders", []),
                "execution_id": execution.get("id")
            }
            
            calendar_events.append(event)
        
        return ApiResponse(
            success=True,
            message=f"Found {len(calendar_events)} calendar events",
            data={
                "events": calendar_events,
                "start_date": start_dt.isoformat(),
                "end_date": end_dt.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting calendar events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get calendar events: {str(e)}"
        )


# ============================================================================
# MEASUREMENT RESULTS ENDPOINTS (New - with CSV extraction)
# ============================================================================

@api_router.get("/measurement-results")
async def get_measurement_results(
    skip: int = 0,
    limit: int = 50,
    station_name: Optional[str] = None,
    measurement_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get measurement results with filtering"""
    try:
        # Build query
        query = {}
        
        if station_name:
            query["station_name"] = {"$regex": station_name, "$options": "i"}
        
        if measurement_type:
            query["measurement_type"] = measurement_type
        
        if start_date:
            query["measurement_start"] = {"$gte": datetime.fromisoformat(start_date)}
        
        if end_date:
            if "measurement_start" in query:
                query["measurement_start"]["$lte"] = datetime.fromisoformat(end_date)
            else:
                query["measurement_start"] = {"$lte": datetime.fromisoformat(end_date)}
        
        # Get total count
        total = await db.measurement_results.count_documents(query)
        
        # Get results
        cursor = db.measurement_results.find(query).sort("measurement_start", -1).skip(skip).limit(limit)
        results = await cursor.to_list(length=limit)
        
        return ApiResponse(
            success=True,
            message=f"Found {len(results)} measurement results (total: {total})",
            data={
                "results": results,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting measurement results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get measurement results: {str(e)}"
        )

@api_router.get("/measurement-results/{result_id}")
async def get_measurement_result_detail(
    result_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed measurement result with CSV data"""
    try:
        result = await db.measurement_results.find_one({"id": result_id})
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Measurement result not found"
            )
        
        # Read CSV data if available
        csv_data = []
        if result.get("csv_file_path") and os.path.exists(result["csv_file_path"]):
            import csv
            with open(result["csv_file_path"], 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                csv_data = list(reader)
        
        # Read XML if needed
        xml_content = None
        if result.get("xml_file_path") and os.path.exists(result["xml_file_path"]):
            with open(result["xml_file_path"], 'r', encoding='utf-8') as xmlfile:
                xml_content = xmlfile.read()
        
        return ApiResponse(
            success=True,
            message="Measurement result retrieved",
            data={
                "metadata": result,
                "csv_data": csv_data,
                "xml_content": xml_content
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting measurement result detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get measurement result: {str(e)}"
        )

@api_router.get("/measurement-results/{result_id}/csv")
async def download_measurement_csv(
    result_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download CSV data for a measurement result"""
    from fastapi.responses import FileResponse
    
    try:
        result = await db.measurement_results.find_one({"id": result_id})
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Measurement result not found"
            )
        
        csv_path = result.get("csv_file_path")
        if not csv_path or not os.path.exists(csv_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CSV file not found"
            )
        
        return FileResponse(
            csv_path,
            media_type="text/csv",
            filename=f"{result['order_id']}_data.csv"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading CSV: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download CSV: {str(e)}"
        )

# ============================================================================
# MEASUREMENT VISUALIZATION ENDPOINTS
# ============================================================================

@api_router.get("/measurements/{measurement_id}/data")
async def get_measurement_data(
    measurement_id: str, 
    current_user: User = Depends(get_current_user)
):
    """Get measurement data for visualization"""
    try:
        # Fetch measurement from database
        measurement = await db.measurements.find_one({"id": measurement_id})
        
        if not measurement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Measurement not found"
            )
        
        # Read data from file
        file_path = measurement.get("file_path")
        if not file_path or not os.path.exists(file_path):
            # Return mock data for demonstration
            return generate_mock_measurement_data(measurement.get("measurement_type", "FFM"))
        
        # Parse file based on format
        file_format = measurement.get("file_format", "xml")
        if file_format == "xml":
            data = parse_xml_measurement_data(file_path)
        elif file_format == "json":
            import json
            with open(file_path, 'r') as f:
                data = json.load(f)
        elif file_format == "csv":
            data = parse_csv_measurement_data(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {file_format}"
            )
        
        return ApiResponse(
            success=True,
            message="Measurement data retrieved",
            data=data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting measurement data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get measurement data: {str(e)}"
        )

def generate_mock_measurement_data(measurement_type: str) -> Dict[str, Any]:
    """Generate mock measurement data for demonstration"""
    import numpy as np
    
    if measurement_type == "FFM":
        # Fixed frequency mode - time series
        times = np.arange(0, 300, 1)  # 5 minutes
        levels = -70 + np.random.normal(0, 2, len(times))  # -70 dBm with noise
        
        return {
            "measurement_type": "FFM",
            "frequency": 100000000,  # 100 MHz
            "unit": "dBm",
            "data": [
                {"time": float(t), "level": float(level)} 
                for t, level in zip(times, levels)
            ]
        }
    
    elif measurement_type in ["SCAN", "PSCAN"]:
        # Frequency scan - spectrum
        freq_start = 88000000  # 88 MHz
        freq_stop = 108000000  # 108 MHz
        num_points = 800
        
        frequencies = np.linspace(freq_start, freq_stop, num_points)
        # Simulate FM broadcast band with some peaks
        levels = -90 + np.random.normal(0, 5, num_points)
        # Add some signal peaks
        for peak_freq in [90.5e6, 95.2e6, 98.7e6, 103.1e6]:
            peak_idx = np.argmin(np.abs(frequencies - peak_freq))
            levels[peak_idx-5:peak_idx+5] = -40 + np.random.normal(0, 2, 10)
        
        return {
            "measurement_type": measurement_type,
            "frequency_start": float(freq_start),
            "frequency_stop": float(freq_stop),
            "unit": "dBm",
            "data": [
                {"frequency": float(freq), "level": float(level)} 
                for freq, level in zip(frequencies, levels)
            ]
        }
    
    elif measurement_type == "DSCAN":
        # Direction finding - polar data
        angles = np.arange(0, 360, 5)  # Every 5 degrees
        levels = -80 + np.random.normal(0, 5, len(angles))
        # Add main signal direction at ~90 degrees
        peak_idx = 18  # 90 degrees
        levels[peak_idx-2:peak_idx+2] = -35 + np.random.normal(0, 1, 4)
        
        return {
            "measurement_type": "DSCAN",
            "frequency": 150000000,  # 150 MHz
            "unit": "dBm",
            "data": [
                {"angle": float(angle), "level": float(level)} 
                for angle, level in zip(angles, levels)
            ]
        }
    
    else:
        # Generic measurement
        return {
            "measurement_type": measurement_type,
            "data": []
        }

def parse_xml_measurement_data(file_path: str) -> Dict[str, Any]:
    """Parse XML measurement data file"""
    import xml.etree.ElementTree as ET
    
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # Extract measurement info
    meas_type = root.findtext(".//MEAS_TYPE", "UNKNOWN")
    frequency = root.findtext(".//FREQUENCY")
    
    # Parse data points
    data = []
    for point in root.findall(".//DATA_POINT"):
        data_point = {}
        for child in point:
            try:
                data_point[child.tag.lower()] = float(child.text)
            except (ValueError, TypeError):
                data_point[child.tag.lower()] = child.text
        data.append(data_point)
    
    return {
        "measurement_type": meas_type,
        "frequency": float(frequency) if frequency else None,
        "data": data
    }

def parse_csv_measurement_data(file_path: str) -> Dict[str, Any]:
    """Parse CSV measurement data file"""
    import csv
    
    data = []
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            data_point = {}
            for key, value in row.items():
                try:
                    data_point[key.lower()] = float(value)
                except (ValueError, TypeError):
                    data_point[key.lower()] = value
            data.append(data_point)
    
    return {
        "measurement_type": "UNKNOWN",
        "data": data
    }

# ============================================================================
# HEALTH CHECK
# ============================================================================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }

@app.get("/api/measurements/{order_id}/data")
async def get_measurement_data(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed measurement data including all data points"""
    try:
        import xml.etree.ElementTree as ET
        
        # Find measurement result
        measurement = await db.measurement_results.find_one({"order_id": order_id})
        
        if not measurement:
            raise HTTPException(status_code=404, detail="Measurement not found")
        
        # Read CSV file if it exists
        csv_file_path = measurement.get("csv_file_path")
        data_points = []
        
        if csv_file_path and Path(csv_file_path).exists():
            import csv
            with open(csv_file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                data_points = list(reader)
        else:
            # Fallback: Parse XML directly
            xml_file_path = measurement.get("xml_file_path")
            if xml_file_path and Path(xml_file_path).exists():
                logger.info(f"CSV not found, parsing XML directly: {xml_file_path}")
                tree = ET.parse(xml_file_path)
                root = tree.getroot()
                
                # Parse MEAS_DATA elements
                for meas_elem in root.findall(".//MEAS_DATA"):
                    point = {}
                    
                    freq_elem = meas_elem.find("MD_M_FREQ")
                    if freq_elem is not None and freq_elem.text:
                        point["frequency_hz"] = freq_elem.text
                    
                    level_elem = meas_elem.find("MD_LEV")
                    if level_elem is not None and level_elem.text:
                        point["level_dbm"] = level_elem.text
                    
                    level_unit_elem = meas_elem.find("MD_D_LEV_U")
                    if level_unit_elem is not None and level_unit_elem.text:
                        point["level_unit"] = level_unit_elem.text
                    
                    time_elem = meas_elem.find("MD_TIME")
                    if time_elem is not None and time_elem.text:
                        point["timestamp"] = time_elem.text
                    
                    bearing_elem = meas_elem.find("MD_DIR")
                    if bearing_elem is not None and bearing_elem.text:
                        point["bearing_deg"] = bearing_elem.text
                    
                    if point:
                        data_points.append(point)
                
                logger.info(f"Parsed {len(data_points)} data points from XML")
        
        # Remove MongoDB _id
        if '_id' in measurement:
            del measurement['_id']
        
        return {
            "measurement": measurement,
            "data_points": data_points,
            "has_data": len(data_points) > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching measurement data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Include routers in app
app.include_router(api_router)

# Add Data Navigator router
data_router = create_data_navigator_router(db)
app.include_router(data_router)

# Add AMM router - will be initialized in lifespan
amm_router = None

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
