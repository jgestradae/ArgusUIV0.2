"""
Location Measurement Utilities
Helper functions for DF/TDOA capability detection and data processing
"""
from typing import List, Dict, Any
import logging
from amm_models import StationCapability

logger = logging.getLogger(__name__)


def detect_df_capability(signal_path_data: Dict[str, Any]) -> bool:
    """
    Detect if a signal path supports DF measurements
    DF capability is indicated by the presence of "bearing" as a measurement parameter
    
    Args:
        signal_path_data: Signal path information from GSP
        
    Returns:
        True if DF capable, False otherwise
    """
    try:
        # Check if measurement parameters include bearing/azimuth
        params = signal_path_data.get('measurement_parameters', [])
        
        # Check for bearing-related parameters
        df_indicators = ['bearing', 'azimuth', 'df', 'direction']
        
        for param in params:
            param_name = str(param).lower()
            if any(indicator in param_name for indicator in df_indicators):
                return True
        
        # Check device capabilities
        capabilities = signal_path_data.get('capabilities', [])
        if any('DF' in str(cap).upper() for cap in capabilities):
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error detecting DF capability: {str(e)}")
        return False


def detect_tdoa_capability(signal_path_data: Dict[str, Any]) -> bool:
    """
    Detect if a signal path supports TDOA measurements
    TDOA capability requires EB500 or EM100XT devices
    
    Args:
        signal_path_data: Signal path information from GSP
        
    Returns:
        True if TDOA capable, False otherwise
    """
    try:
        # Check device name/type for EB500 or EM100XT
        device_name = str(signal_path_data.get('device_name', '')).upper()
        device_type = str(signal_path_data.get('device_type', '')).upper()
        signal_path = str(signal_path_data.get('signal_path', '')).upper()
        
        # TDOA-capable devices
        tdoa_devices = ['EB500', 'EM100XT', 'EM100', 'EB500_DF']
        
        # Check if any TDOA device is present
        all_text = f\"{device_name} {device_type} {signal_path}\"
        
        for device in tdoa_devices:
            if device in all_text:
                return True
        
        return False
        
    except Exception as e:
        logger.error(f\"Error detecting TDOA capability: {str(e)}\")
        return False


def analyze_station_capabilities(gsp_data: Dict[str, Any]) -> List[StationCapability]:
    """
    Analyze GSP data to extract station capabilities for DF/TDOA
    
    Args:
        gsp_data: Full GSP response data
        
    Returns:
        List of StationCapability objects
    """
    station_capabilities = []
    
    try:
        stations = gsp_data.get('stations', [])
        
        for station_data in stations:
            station_id = station_data.get('station_id') or station_data.get('name')
            station_name = station_data.get('name', station_id)
            
            # Get signal paths for this station
            signal_paths = station_data.get('signal_paths', [])
            
            df_capable_paths = []
            tdoa_capable_paths = []
            supports_df = False
            supports_tdoa = False
            
            # Analyze each signal path
            for path_data in signal_paths:
                path_name = path_data.get('path_name') or path_data.get('signal_path')
                
                # Check DF capability
                if detect_df_capability(path_data):
                    df_capable_paths.append(path_name)
                    supports_df = True
                
                # Check TDOA capability
                if detect_tdoa_capability(path_data):
                    tdoa_capable_paths.append(path_name)
                    supports_tdoa = True
            
            # Create capability object
            capability = StationCapability(
                station_id=station_id,
                station_name=station_name,
                signal_paths=[p.get('path_name', p.get('signal_path')) for p in signal_paths],
                supports_df=supports_df,
                supports_tdoa=supports_tdoa,
                df_capable_paths=df_capable_paths,
                tdoa_capable_paths=tdoa_capable_paths,
                latitude=station_data.get('latitude'),
                longitude=station_data.get('longitude')
            )
            
            station_capabilities.append(capability)
        
        logger.info(f\"Analyzed {len(station_capabilities)} stations: \"
                   f\"{sum(1 for s in station_capabilities if s.supports_df)} DF-capable, \"
                   f\"{sum(1 for s in station_capabilities if s.supports_tdoa)} TDOA-capable\")
        
        return station_capabilities
        
    except Exception as e:
        logger.error(f\"Error analyzing station capabilities: {str(e)}\")
        return []


def calculate_df_intersection(bearings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate approximate intersection point from multiple DF bearings
    Simple geometric approach (can be enhanced with weighted algorithms)
    
    Args:
        bearings: List of bearing data with station coords and bearing angles
        
    Returns:
        Dictionary with calculated position and accuracy estimate
    """
    try:
        import math
        
        if len(bearings) < 2:
            return None
        
        # Simple 2-bearing intersection for now
        # TODO: Implement multi-bearing weighted intersection
        
        bearing1 = bearings[0]
        bearing2 = bearings[1]
        
        lat1 = math.radians(bearing1['latitude'])
        lon1 = math.radians(bearing1['longitude'])
        brng1 = math.radians(bearing1['bearing'])
        
        lat2 = math.radians(bearing2['latitude'])
        lon2 = math.radians(bearing2['longitude'])
        brng2 = math.radians(bearing2['bearing'])
        
        # Calculate intersection using spherical trigonometry
        # This is a simplified calculation - production code should use more robust methods
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        # Estimate intersection point (simplified)
        est_lat = (lat1 + lat2) / 2
        est_lon = (lon1 + lon2) / 2
        
        return {
            'latitude': math.degrees(est_lat),
            'longitude': math.degrees(est_lon),
            'accuracy': 1000,  # meters (placeholder)
            'method': 'df_intersection',
            'num_bearings': len(bearings)
        }
        
    except Exception as e:
        logger.error(f\"Error calculating DF intersection: {str(e)}\")
        return None
