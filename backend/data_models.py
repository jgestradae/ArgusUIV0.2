from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class DataType(str, Enum):
    MEASUREMENT_RESULT = "measurement_result"
    GRAPH = "graph"
    AUDIO = "audio"
    REGISTRY = "registry"
    USER_LOG = "user_log"
    AUTOMATIC_DEFINITION = "automatic_definition"

class FileFormat(str, Enum):
    XML = "xml"
    JSON = "json"
    PNG = "png"
    JPG = "jpg"
    WAV = "wav"
    MP3 = "mp3"
    TXT = "txt"
    CSV = "csv"
    BIN = "bin"

# Base Data Item
class DataItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: DataType
    description: Optional[str] = None
    file_path: str
    file_format: FileFormat
    file_size: Optional[int] = None  # bytes
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

# Measurement Results
class MeasurementResult(DataItem):
    type: DataType = DataType.MEASUREMENT_RESULT
    measurement_type: str  # FFM, SCAN, etc.
    frequency: Optional[float] = None  # Hz
    frequency_range_start: Optional[float] = None
    frequency_range_end: Optional[float] = None
    station_name: Optional[str] = None
    measurement_duration: Optional[float] = None  # seconds
    status: str = "completed"  # completed, failed, processing
    order_id: Optional[str] = None  # Link to original order
    result_summary: Optional[Dict[str, Any]] = None

# Graphs and Charts
class MeasurementGraph(DataItem):
    type: DataType = DataType.GRAPH
    graph_type: str  # spectrum_plot, waterfall, etc.
    measurement_id: Optional[str] = None  # Link to measurement
    width: Optional[int] = None
    height: Optional[int] = None
    axes_info: Optional[Dict[str, str]] = None

# Audio Recordings
class AudioRecording(DataItem):
    type: DataType = DataType.AUDIO
    measurement_id: Optional[str] = None  # Link to measurement
    duration: Optional[float] = None  # seconds
    sample_rate: Optional[int] = None  # Hz
    channels: Optional[int] = 1
    bit_depth: Optional[int] = None
    frequency: Optional[float] = None  # Center frequency
    demodulation: Optional[str] = None

# Measurement Registry
class MeasurementRegistry(DataItem):
    type: DataType = DataType.REGISTRY
    registry_type: str = "daily_log"
    date: datetime
    measurements_count: Optional[int] = None
    stations_involved: List[str] = []
    frequency_bands: List[Dict[str, float]] = []  # [{"start": 100e6, "end": 200e6}]

# User Activity Logs
class UserLog(DataItem):
    type: DataType = DataType.USER_LOG
    log_type: str  # authentication, system, measurement
    date: datetime
    entries_count: Optional[int] = None
    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR
    user_id: Optional[str] = None

# Automatic Measurement Definitions
class AutomaticDefinition(DataItem):
    type: DataType = DataType.AUTOMATIC_DEFINITION
    schedule_cron: str  # Cron format
    measurement_params: Dict[str, Any]
    is_active: bool = True
    last_execution: Optional[datetime] = None
    next_execution: Optional[datetime] = None
    execution_count: int = 0
    stations: List[str] = []

# API Request/Response Models
class DataItemCreate(BaseModel):
    name: str
    type: DataType
    description: Optional[str] = None
    file_path: str
    file_format: FileFormat
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class DataItemFilter(BaseModel):
    type: Optional[DataType] = None
    name_search: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    tags: List[str] = []
    created_by: Optional[str] = None

class DataNavigatorResponse(BaseModel):
    items: List[Any]  # Can be DataItem or dict for flexibility
    total_count: int
    page: int
    page_size: int
    filters_applied: Dict[str, Any]

# Statistics
class DataStatistics(BaseModel):
    type: DataType
    count: int
    total_size: int  # bytes
    latest_item: Optional[datetime] = None
    oldest_item: Optional[datetime] = None
