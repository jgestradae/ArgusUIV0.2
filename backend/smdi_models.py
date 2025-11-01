"""
SMDI (Spectrum Management Database Interface) Data Models
Handles data structures for Frequency List (IFL) and Transmitter List (ITL) queries
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import uuid


# ============================================================================
# Query Parameter Models
# ============================================================================

class FrequencyQueryParams(BaseModel):
    """Frequency query parameters for IFL/ITL"""
    mode: Literal["S", "L", "R", "N"] = Field(
        default="N",
        description="Frequency mode: S=Single, L=List, R=Range, N=No restriction"
    )
    single_freq: Optional[float] = Field(
        default=None,
        description="Single frequency in Hz (when mode=S)"
    )
    freq_list: Optional[List[float]] = Field(
        default=None,
        description="List of frequencies in Hz (when mode=L)"
    )
    range_lower: Optional[float] = Field(
        default=None,
        description="Lower frequency limit in Hz (when mode=R)"
    )
    range_upper: Optional[float] = Field(
        default=None,
        description="Upper frequency limit in Hz (when mode=R)"
    )
    step: Optional[float] = Field(
        default=None,
        description="Step width frequency in Hz (when mode=R)"
    )


class LocationQueryParams(BaseModel):
    """Location query parameters for IFL/ITL"""
    mode: Literal["N", "C", "COORD"] = Field(
        default="N",
        description="Location mode: N=No restriction, C=Country, COORD=Coordinates"
    )
    country: Optional[str] = Field(
        default=None,
        description="Country code (when mode=C)"
    )
    city: Optional[str] = Field(default=None, description="City name")
    zip_code: Optional[str] = Field(default=None, description="Area/ZIP code")
    
    # Coordinates (when mode=COORD)
    longitude_deg: Optional[int] = Field(default=None, description="Longitude degrees")
    longitude_min: Optional[int] = Field(default=None, description="Longitude minutes")
    longitude_sec: Optional[float] = Field(default=None, description="Longitude seconds")
    longitude_hem: Optional[Literal["E", "W"]] = Field(default=None, description="Longitude hemisphere")
    
    latitude_deg: Optional[int] = Field(default=None, description="Latitude degrees")
    latitude_min: Optional[int] = Field(default=None, description="Latitude minutes")
    latitude_sec: Optional[float] = Field(default=None, description="Latitude seconds")
    latitude_hem: Optional[Literal["N", "S"]] = Field(default=None, description="Latitude hemisphere")
    
    radius: Optional[float] = Field(
        default=None,
        description="Radius in km from coordinates"
    )


class AdditionalQueryParams(BaseModel):
    """Additional optional search criteria for IFL/ITL"""
    service: Optional[str] = Field(default=None, description="Service code (e.g., BC, FM, AM)")
    signature: Optional[str] = Field(default=None, description="Transmitter signature")
    call_sign: Optional[str] = Field(default=None, description="Call sign")
    licensee: Optional[str] = Field(default=None, description="Licensee name")
    license_state: Optional[str] = Field(default=None, description="License state")
    system_name: Optional[str] = Field(default=None, description="System name")


class SMDIQueryRequest(BaseModel):
    """Complete SMDI query request for IFL or ITL"""
    query_type: Literal["IFL", "ITL"] = Field(
        description="Query type: IFL=Frequency List, ITL=Transmitter List"
    )
    result_option: Literal["transmitters", "occupied_freq", "unassigned_freq"] = Field(
        default="transmitters",
        description="Result type: transmitters, occupied_freq, unassigned_freq"
    )
    include_bandwidth: bool = Field(
        default=False,
        description="Include bandwidth information"
    )
    list_name: Optional[str] = Field(
        default=None,
        description="Name for the result list"
    )
    
    frequency_params: FrequencyQueryParams = Field(
        default_factory=FrequencyQueryParams
    )
    location_params: LocationQueryParams = Field(
        default_factory=LocationQueryParams
    )
    additional_params: AdditionalQueryParams = Field(
        default_factory=AdditionalQueryParams
    )
    
    database_selection: Optional[str] = Field(
        default=None,
        description="Database selection"
    )
    auto_update: bool = Field(
        default=False,
        description="Automatic update flag"
    )


# ============================================================================
# Response Data Models (Frequency List)
# ============================================================================

class FrequencyListItem(BaseModel):
    """Single frequency entry from FREQ_RES"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tx_id: Optional[int] = Field(default=None, description="Transmitter ID")
    frequency: float = Field(description="Frequency in Hz")
    lower_freq: Optional[float] = Field(default=None, description="Lower channel frequency")
    upper_freq: Optional[float] = Field(default=None, description="Upper channel frequency")
    channel: Optional[str] = Field(default=None, description="Channel number")
    channel_spacing: Optional[float] = Field(default=None, description="Channel spacing in Hz")
    bandwidth: Optional[float] = Field(default=None, description="Bandwidth in Hz")
    transmitter_name: Optional[str] = Field(default=None, description="Transmitter name")
    spectrum_type: Optional[int] = Field(
        default=None,
        description="Spectrum usage: 0=free, 1=occupied"
    )
    transmitter_count: Optional[int] = Field(
        default=None,
        description="Number of transmitters on frequency"
    )


class FrequencyListResult(BaseModel):
    """Complete frequency list result"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = Field(description="Order ID from XML")
    order_type: str = Field(default="IOFL", description="Order type (IOFL)")
    query_name: Optional[str] = Field(default=None, description="User-defined query name")
    status: str = Field(description="Order status (e.g., Finished)")
    error_code: Optional[str] = Field(default=None, description="Error code")
    error_message: Optional[str] = Field(default=None, description="Error message")
    
    query_params: SMDIQueryRequest = Field(description="Original query parameters")
    
    frequencies: List[FrequencyListItem] = Field(
        default_factory=list,
        description="List of frequency results"
    )
    
    created_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Creation timestamp"
    )


# ============================================================================
# Response Data Models (Transmitter List)
# ============================================================================

class TransmitterListItem(BaseModel):
    """Single transmitter entry from TX_RES"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Basic info
    tx_id: Optional[int] = Field(default=None, description="Transmitter ID")
    rx_id: Optional[int] = Field(default=None, description="Receiver ID")
    modify_flag: Optional[int] = Field(
        default=None,
        description="Modify flag: 0=new/unmodified, 1=modified"
    )
    
    # Frequency info
    frequency: float = Field(description="Frequency in Hz")
    channel: Optional[str] = Field(default=None, description="Channel number")
    channel_spacing: Optional[float] = Field(default=None, description="Fine tuning in Hz")
    
    # Service info
    service: Optional[str] = Field(default=None, description="Service/class of transmitter")
    signature: Optional[str] = Field(default=None, description="Signature")
    call_sign: Optional[str] = Field(default=None, description="Call sign")
    
    # License info
    licensee_name: Optional[str] = Field(default=None, description="Licensee name")
    license_state: Optional[str] = Field(default=None, description="License state")
    
    # Station info
    station_name: Optional[str] = Field(default=None, description="Station name")
    phone: Optional[str] = Field(default=None, description="Phone number")
    zip_code: Optional[str] = Field(default=None, description="ZIP/Area code")
    city: Optional[str] = Field(default=None, description="City")
    street: Optional[str] = Field(default=None, description="Street")
    country: Optional[str] = Field(default=None, description="Country")
    
    # Location coordinates
    longitude: Optional[float] = Field(default=None, description="Longitude in decimal degrees")
    latitude: Optional[float] = Field(default=None, description="Latitude in decimal degrees")
    longitude_deg: Optional[int] = Field(default=None, description="Longitude degrees")
    longitude_min: Optional[int] = Field(default=None, description="Longitude minutes")
    longitude_sec: Optional[float] = Field(default=None, description="Longitude seconds")
    longitude_hem: Optional[str] = Field(default=None, description="Longitude hemisphere")
    latitude_deg: Optional[int] = Field(default=None, description="Latitude degrees")
    latitude_min: Optional[int] = Field(default=None, description="Latitude minutes")
    latitude_sec: Optional[float] = Field(default=None, description="Latitude seconds")
    latitude_hem: Optional[str] = Field(default=None, description="Latitude hemisphere")
    
    distance: Optional[float] = Field(
        default=None,
        description="Distance from query coordinates in km"
    )
    
    # Technical parameters
    freq_offset_limit: Optional[float] = Field(default=None, description="Frequency offset limit")
    freq_offset_unit: Optional[str] = Field(default=None, description="Frequency offset unit")
    freq_offset_comment: Optional[str] = Field(default=None, description="Frequency offset comment")
    
    bandwidth_limit: Optional[float] = Field(default=None, description="Bandwidth limit")
    bandwidth_unit: Optional[str] = Field(default=None, description="Bandwidth unit")
    bandwidth_comment: Optional[str] = Field(default=None, description="Bandwidth comment")
    
    modulation_limit: Optional[float] = Field(default=None, description="Modulation limit")
    modulation_unit: Optional[str] = Field(default=None, description="Modulation unit")
    modulation_type: Optional[str] = Field(default=None, description="Modulation type")
    modulation_comment: Optional[str] = Field(default=None, description="Modulation comment")
    
    polarization: Optional[str] = Field(default=None, description="Polarization")
    antenna_height: Optional[float] = Field(default=None, description="Antenna height")


class TransmitterListResult(BaseModel):
    """Complete transmitter list result"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = Field(description="Order ID from XML")
    order_type: str = Field(default="ITL", description="Order type (ITL)")
    query_name: Optional[str] = Field(default=None, description="User-defined query name")
    status: str = Field(description="Order status (e.g., Finished)")
    error_code: Optional[str] = Field(default=None, description="Error code")
    error_message: Optional[str] = Field(default=None, description="Error message")
    
    query_params: SMDIQueryRequest = Field(description="Original query parameters")
    
    transmitters: List[TransmitterListItem] = Field(
        default_factory=list,
        description="List of transmitter results"
    )
    
    created_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Creation timestamp"
    )
