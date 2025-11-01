"""
Report Module Data Models
Defines data structures for report generation, storage, and management
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import uuid


# ============================================================================
# Report Request Models
# ============================================================================

class ReportFilterParams(BaseModel):
    """Filter parameters for report data selection"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    station_ids: Optional[List[str]] = None
    frequency_range: Optional[Dict[str, float]] = None  # {"start": MHz, "end": MHz}
    measurement_types: Optional[List[str]] = None  # ["FFM", "SCAN", "DF"]
    status_filter: Optional[List[str]] = None
    

class ReportCreationRequest(BaseModel):
    """Request to create a new report"""
    report_type: Literal[
        "measurement_results",
        "station_status",
        "system_performance",
        "user_activity",
        "frequency_occupancy",
        "custom"
    ]
    report_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    filters: ReportFilterParams = Field(default_factory=ReportFilterParams)
    export_format: Optional[Literal["PDF", "CSV", "EXCEL", "DOCX", "XML"]] = None
    include_charts: bool = True
    include_summary: bool = True
    

# ============================================================================
# Report Data Models
# ============================================================================

class ReportMetadata(BaseModel):
    """Report metadata and information"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_type: str
    report_name: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    filters: Dict[str, Any] = {}
    status: Literal["generating", "completed", "failed"] = "generating"
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    export_formats: List[str] = []
    error_message: Optional[str] = None
    

class MeasurementResultData(BaseModel):
    """Measurement result entry for report"""
    measurement_id: str
    station_name: str
    measurement_type: str
    frequency: float  # Hz
    level: float  # dBm or dBµV
    bandwidth: Optional[float] = None
    modulation: Optional[str] = None
    azimuth: Optional[float] = None
    quality: Optional[float] = None
    timestamp: datetime
    duration: Optional[int] = None  # seconds
    status: str
    

class StationStatusData(BaseModel):
    """Station status entry for report"""
    station_id: str
    station_name: str
    status: str
    is_online: bool
    uptime_hours: Optional[float] = None
    tasks_completed: Optional[int] = None
    tasks_failed: Optional[int] = None
    alarms: List[str] = []
    last_measurement: Optional[datetime] = None
    connection_quality: Optional[int] = None
    

class SystemPerformanceData(BaseModel):
    """System performance metrics for report"""
    total_measurements: int
    successful_measurements: int
    failed_measurements: int
    average_measurement_duration: Optional[float] = None
    stations_online: int
    stations_total: int
    system_uptime: float  # percentage
    database_size: Optional[int] = None  # bytes
    

class UserActivityData(BaseModel):
    """User activity entry for report"""
    user_id: str
    username: str
    action_type: str
    action_description: str
    timestamp: datetime
    ip_address: Optional[str] = None
    success: bool = True
    

class FrequencyOccupancyData(BaseModel):
    """Frequency occupancy data for report"""
    frequency_start: float
    frequency_stop: float
    occupancy_percentage: float
    peak_level: Optional[float] = None
    average_level: Optional[float] = None
    dominant_signals: List[Dict[str, Any]] = []
    

# ============================================================================
# Report Content Models
# ============================================================================

class ReportContent(BaseModel):
    """Complete report content structure"""
    metadata: ReportMetadata
    summary: Dict[str, Any] = {}
    data: List[Dict[str, Any]] = []
    charts: List[Dict[str, Any]] = []  # Chart data and configurations
    statistics: Dict[str, Any] = {}
    

class ReportExportResult(BaseModel):
    """Result of report export operation"""
    success: bool
    report_id: str
    export_format: str
    file_path: str
    file_size: int
    download_url: str
    generated_at: datetime = Field(default_factory=datetime.now)
