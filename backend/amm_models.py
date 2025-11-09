from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, time
from enum import Enum
import uuid

class ScheduleType(str, Enum):
    ALWAYS = "always"
    SPAN = "span"
    PERIODIC = "periodic"
    DAILY = "daily"
    WEEKDAYS = "weekdays"
    INTERVAL = "interval"

class MeasurementType(str, Enum):
    FFM = "FFM"
    SCAN = "SCAN"
    DSCAN = "DSCAN"
    PSCAN = "PSCAN"
    FLSCAN = "FLSCAN"  # Frequency List Scan
    TLSCAN = "TLSCAN"  # Transmitter List Scan
    LOCATION = "LOCATION"  # DF/TDOA measurements
    COVERAGE = "COVERAGE"
    DIGITAL = "DIGITAL"

class LocationMeasurementType(str, Enum):
    """Location measurement sub-types"""
    DF = "DF"      # Direction Finding (bearing measurements)
    TDOA = "TDOA"  # Time Difference of Arrival

class AlarmType(str, Enum):
    OVERSHOOT = "overshoot"
    UNDERSHOOT = "undershoot"
    LIMIT_LINE = "limit_line"

class NotificationType(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    MESSAGE = "message"
    XML_FILE = "xml_file"
    SIGNAL_TONE = "signal_tone"

class GraphicType(str, Enum):
    YT_PLOT = "yt_plot"
    CARTESIAN = "cartesian"
    WATERFALL_3D = "waterfall_3d"
    WATERFALL_2D = "waterfall_2d"
    POLAR = "polar"

class AMMStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    COMPLETED = "completed"
    ERROR = "error"

# Timing Definition
class TimingDefinition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    schedule_type: ScheduleType
    
    # Span scheduling
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Daily/Periodic scheduling - stored as strings (HH:MM:SS format)
    start_time: Optional[str] = None  # Changed from time to str for MongoDB compatibility
    end_time: Optional[str] = None    # Changed from time to str for MongoDB compatibility
    
    # Weekdays scheduling
    weekdays: List[int] = []  # 0=Monday, 6=Sunday
    
    # Interval scheduling
    interval_minutes: Optional[int] = None
    interval_hours: Optional[int] = None
    interval_days: Optional[int] = None
    
    # Fragmentation
    fragmentation_enabled: bool = False
    fragment_duration_minutes: Optional[int] = None
    fragment_interval_minutes: Optional[int] = None
    
    # Advanced options
    continue_after_restart: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Alarm Configuration
class AlarmConfiguration(BaseModel):
    enabled: bool = False
    alarm_type: AlarmType
    threshold_value: float
    count_for_trigger: int = 1
    dwell_time_ms: Optional[int] = None
    hold_time_ms: Optional[int] = None
    
    # Notifications
    notifications: List[NotificationType] = []
    email_addresses: List[str] = []
    sms_numbers: List[str] = []
    
    # Alarm frequencies capture
    capture_alarm_frequencies: bool = False

# Antenna Configuration
class AntennaConfiguration(BaseModel):
    antenna_path: str
    azimuth: Optional[float] = None
    elevation: Optional[float] = None
    polarization: Optional[str] = None
    height: Optional[float] = None
    variable_settings: bool = False

# Receiver Configuration
class ReceiverConfiguration(BaseModel):
    if_bandwidth: Optional[float] = None  # Hz
    rf_mode: Optional[str] = None
    demodulation: Optional[str] = None
    detector: Optional[str] = "Average"
    rf_attenuation: str = "Auto"
    preamplifier: bool = False
    measurement_time: Optional[float] = None  # seconds
    df_mode: Optional[str] = None
    df_bandwidth: Optional[float] = None
    df_integration_time: Optional[float] = None

# Measurement Definition
class MeasurementDefinition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    measurement_type: MeasurementType
    
    # Device and Station
    signal_path: Optional[str] = None  # MSP_SIG_PATH - System/Signal path (ORM 4.2)
    device_name: str  # Kept for backwards compatibility
    station_names: List[str]
    
    # Result Configuration (ORM 4.1)
    result_type: str = "MR"  # MR=Measurement Result, CMR=Compress measurement result, MaxHold=MaxHold, AMR=Measurement Result during an alarm
    
    # Frequency Configuration
    frequency_mode: str = "S"  # S=Single, R=Range, L=List
    frequency_single: Optional[float] = None  # Hz
    frequency_range_start: Optional[float] = None  # Hz
    frequency_range_end: Optional[float] = None  # Hz
    frequency_step: Optional[float] = None  # Hz
    frequency_list: List[float] = []  # Hz
    
    # Configuration
    receiver_config: ReceiverConfiguration
    antenna_config: AntennaConfiguration
    
    # Measured Parameters
    measured_parameters: List[str] = ["Level"]  # Level, Frequency, Bearing, Bandwidth, etc.
    
    # Monitoring & Alarms
    alarm_configs: List[AlarmConfiguration] = []
    
    # Location Measurement (if applicable)
    bearing_stations: List[str] = []
    tdoa_stations: List[str] = []
    
    # Difference Measurement
    difference_measurement: bool = False
    second_receiver_path: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Range Definition
class RangeDefinition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    
    # System Path Configuration
    system_path: str
    antenna_characteristics: Dict[str, Any] = {}
    receiver_characteristics: Dict[str, Any] = {}
    
    # Frequency Range
    frequency_start: float  # Hz
    frequency_end: float    # Hz
    frequency_resolution: Optional[float] = None  # Hz
    
    # Range-specific settings
    scan_speed: Optional[str] = None
    sweep_mode: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Result Configuration
class ResultConfiguration(BaseModel):
    # Graphic Configuration
    graphic_type: GraphicType
    display_raw_data: bool = True
    
    # File Saving
    save_measurement_results: bool = True
    save_compressed: bool = False
    file_format: str = "xml"
    
    # Database Configuration
    save_to_database: bool = True
    database_save_interval_minutes: Optional[int] = None
    
    # Alarm Result Handling
    save_alarm_frequencies: bool = False
    log_alarm_messages: bool = True

# General Definition
class GeneralDefinition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    
    # Result Configuration
    result_config: ResultConfiguration
    
    # Alarm Message Handling
    alarm_message_forwarding: bool = False
    alarm_log_file: Optional[str] = None
    
    # Data Management
    auto_cleanup_old_results: bool = False
    cleanup_after_days: Optional[int] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# AMM Configuration (Main)
class AMMConfiguration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    status: AMMStatus = AMMStatus.DRAFT
    
    # Definition References
    timing_definition_id: str
    measurement_definition_id: str
    range_definition_id: str
    general_definition_id: str
    
    # Execution Info
    last_execution: Optional[datetime] = None
    next_execution: Optional[datetime] = None
    execution_count: int = 0
    error_count: int = 0
    last_error: Optional[str] = None
    
    # Creation Info
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    modified_at: Optional[datetime] = None
    modified_by: Optional[str] = None

# AMM Execution Instance
class AMMExecution(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amm_config_id: str
    
    # Execution Details
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str = "running"  # running, completed, failed, cancelled
    
    # Generated Orders
    generated_orders: List[str] = []  # Order IDs
    
    # Results
    measurement_files: List[str] = []
    alarm_count: int = 0
    error_message: Optional[str] = None
    
    # Execution Statistics
    measurements_performed: int = 0
    data_points_collected: int = 0
    total_duration_seconds: Optional[float] = None

# API Models
class AMMConfigurationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    timing_definition: TimingDefinition
    measurement_definition: MeasurementDefinition
    range_definition: RangeDefinition
    general_definition: GeneralDefinition

class AMMConfigurationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[AMMStatus] = None
    timing_definition: Optional[TimingDefinition] = None
    measurement_definition: Optional[MeasurementDefinition] = None
    range_definition: Optional[RangeDefinition] = None
    general_definition: Optional[GeneralDefinition] = None

class AMMExecutionSummary(BaseModel):
    amm_config: AMMConfiguration
    recent_executions: List[AMMExecution]
    next_scheduled: Optional[datetime] = None
    is_active: bool = False
    total_executions: int = 0
    success_rate: float = 0.0

class AMMDashboardStats(BaseModel):
    total_amm_configs: int
    active_amm_configs: int
    running_executions: int
    executions_last_24h: int
    alarms_last_24h: int
    success_rate_24h: float
