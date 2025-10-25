from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from typing import List, Optional
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting ArgusUI Backend...")
    
    # Initialize auth manager
    auth_module.auth_manager = AuthManager(db)
    await auth_module.auth_manager.create_default_admin()
    
    # Initialize XML processor with default paths (can be overridden via API)
    global xml_processor, amm_scheduler
    inbox_path = os.getenv("ARGUS_INBOX_PATH", "/tmp/argus_inbox")
    outbox_path = os.getenv("ARGUS_OUTBOX_PATH", "/tmp/argus_outbox")
    data_path = os.getenv("ARGUS_DATA_PATH", "/tmp/argus_data")
    
    xml_processor = ArgusXMLProcessor(inbox_path, outbox_path, data_path)
    logger.info(f"XML Processor initialized - Inbox: {inbox_path}, Outbox: {outbox_path}")
    
    # Initialize AMM scheduler
    amm_scheduler = AMMScheduler(db, xml_processor)
    logger.info("AMM Scheduler initialized")
    
    # Start background task for periodic GSS requests
    import asyncio
    gss_task = asyncio.create_task(periodic_gss_task())
    logger.info("Started periodic GSS task")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ArgusUI Backend...")
    gss_task.cancel()
    try:
        await gss_task
    except asyncio.CancelledError:
        pass
    client.close()

# Create FastAPI app
app = FastAPI(
    title="ArgusUI Backend",
    description="Web interface for R&S Argus spectrum monitoring system",
    version="1.0.0",
    lifespan=lifespan
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

@api_router.get("/system/parameters")
async def get_system_parameters(current_user: User = Depends(get_current_user)):
    """Get Argus system parameters (GSP)"""
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

# Include routers in app
app.include_router(api_router)

# Add Data Navigator router
data_router = create_data_navigator_router(db)
app.include_router(data_router)

# Add AMM router
amm_router = create_amm_router(db, amm_scheduler)
app.include_router(amm_router)

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
