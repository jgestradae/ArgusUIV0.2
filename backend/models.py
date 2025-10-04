from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"

class AuthProvider(str, Enum):
    LOCAL = "local"
    ACTIVE_DIRECTORY = "ad"

# User Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: Optional[str] = None
    role: UserRole
    auth_provider: AuthProvider = AuthProvider.LOCAL
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: UserRole
    auth_provider: AuthProvider = AuthProvider.LOCAL

# Argus Order Models
class OrderType(str, Enum):
    OR = "OR"  # Order Report
    GSS = "GSS"  # Get System State
    GSP = "GSP"  # Get System Parameters
    GMS = "GMS"  # Get Monitoring Statistic
    ST = "ST"   # Stop Order
    OS = "OS"   # Order State

class OrderState(str, Enum):
    OPEN = "Open"
    IN_PROCESS = "In Process"
    FORWARDED = "Forwarded"
    FINISHED = "Finished"
    UNKNOWN = "Unknown"

class SubOrderTask(str, Enum):
    FFM = "FFM"      # Fixed Freq Mode
    SCAN = "SCAN"    # Scan
    DSCAN = "DSCAN"  # D-Scan
    PSCAN = "PSCAN"  # P-Scan
    FLSCAN = "FLSCAN" # Freq List Scan
    TLSCAN = "TLSCAN" # Transmitter List Scan
    SWEEP = "SWEEP"   # Sweep
    IMA = "IMA"       # Intermodulation Analysis
    ITU = "ITU"       # ITU measurement
    DFPAN = "DFPAN"   # DF Pan measurement

class ResultType(str, Enum):
    MR = "MR"         # Measurement Result
    CMR = "CMR"       # Compressed Meas. Results
    AMR = "AMR"       # Measurement Result during Alarm
    LOG = "LOG"       # Start/End of Alarm
    TXT = "TXT"       # Text
    ADC = "ADC"       # ADC stream

# Argus Order Metadata
class ArgusOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_type: OrderType
    order_name: str
    order_state: OrderState = OrderState.OPEN
    suborder_task: Optional[SubOrderTask] = None
    result_type: Optional[ResultType] = None
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    xml_request_file: str  # path to generated XML file
    xml_response_file: Optional[str] = None  # path to response XML file
    measurement_files: List[str] = []  # paths to measurement result files
    error_message: Optional[str] = None
    parameters: Dict[str, Any] = {}  # measurement parameters

# System Status Models
class ArgusSystemState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_running: bool
    current_user: Optional[str] = None
    monitoring_time: Optional[int] = None  # minutes
    df_time: Optional[int] = None  # minutes
    listen_time: Optional[int] = None  # minutes
    stations: List[Dict[str, Any]] = []  # monitoring stations
    devices: List[Dict[str, Any]] = []   # device status
    raw_xml_file: Optional[str] = None   # path to raw XML response

# Measurement Configuration Models
class FrequencyMode(str, Enum):
    SINGLE = "S"      # Single frequency
    LIST = "L"        # Frequency list
    RANGE = "R"       # Frequency range

class MeasurementConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    freq_mode: FrequencyMode
    freq_single: Optional[float] = None  # Hz
    freq_range_low: Optional[float] = None  # Hz
    freq_range_high: Optional[float] = None  # Hz
    freq_step: Optional[float] = None  # Hz
    freq_list: List[float] = []  # Hz
    if_bandwidth: Optional[float] = None  # Hz
    rf_attenuation: Optional[str] = None  # Auto or dB value
    demodulation: Optional[str] = None
    measurement_time: Optional[float] = None  # seconds
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_template: bool = False

# Direct Measurement Request
class DirectMeasurementRequest(BaseModel):
    measurement_name: str
    suborder_task: SubOrderTask
    config_id: Optional[str] = None  # reference to MeasurementConfig
    custom_config: Optional[Dict[str, Any]] = None
    result_type: ResultType = ResultType.MR

# System Logs
class SystemLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: str  # INFO, WARNING, ERROR, DEBUG
    source: str  # API, XML_PROCESSOR, ARGUS
    message: str
    user_id: Optional[str] = None
    order_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

# API Response Models
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class SystemStatusResponse(BaseModel):
    argus_running: bool
    last_update: datetime
    active_measurements: int
    system_health: str
    stations: List[Dict[str, Any]]
    devices: List[Dict[str, Any]]
