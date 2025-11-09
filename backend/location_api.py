"""
Location Measurements API (DF/TDOA)
Endpoints for Direction Finding and Time Difference of Arrival measurements
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import uuid

from auth import get_current_user
from models import User
from amm_models import (
    LocationMeasurementType, DFBearingData, TDOAMeasurementData,
    LocationMeasurementResult, StationCapability
)
from location_utils import analyze_station_capabilities
from xml_processor import ArgusXMLProcessor

logger = logging.getLogger(__name__)


# Request Models
class DFMeasurementRequest(BaseModel):
    """Request model for DF measurement"""
    station_ids: List[str] = Field(..., description="List of DF-capable station IDs")
    frequency: float = Field(..., description="Measurement frequency in Hz", gt=0)
    measurement_time: Optional[float] = Field(1000, description="Measurement time in ms")
    bandwidth: Optional[float] = Field(10000, description="Resolution bandwidth in Hz")
    detector: str = Field("RMS", description="Detector type")
    priority: int = Field(2, description="Order priority", ge=1, le=3)


class TDOAMeasurementRequest(BaseModel):
    """Request model for TDOA measurement"""
    station_ids: List[str] = Field(..., description="List of TDOA-capable station IDs (min 3)")
    frequency: float = Field(..., description="Measurement frequency in Hz", gt=0)
    measurement_time: Optional[float] = Field(1000, description="Measurement time in ms")
    bandwidth: Optional[float] = Field(10000, description="Resolution bandwidth in Hz")
    detector: str = Field("RMS", description="Detector type")
    priority: int = Field(2, description="Order priority", ge=1, le=3)


def create_location_router(db, xml_processor: ArgusXMLProcessor) -> APIRouter:
    """Create and configure Location Measurements API router"""
    
    router = APIRouter(prefix="/api/location", tags=["Location Measurements"])
    
    @router.get("/capabilities")
    async def get_station_capabilities(current_user: User = Depends(get_current_user)):
        """
        Get list of stations with their DF/TDOA capabilities
        
        Analyzes GSP data to determine which stations support DF and/or TDOA
        """
        try:
            # Get latest GSP data from MongoDB
            gsp_data = await db.system_parameters.find_one(sort=[("timestamp", -1)])
            
            if not gsp_data:
                return {
                    'success': False,
                    'message': 'No system parameters available. Please run GSP request first.',
                    'capabilities': []
                }
            
            # Analyze capabilities
            capabilities = analyze_station_capabilities(gsp_data)
            
            # Convert to dict for JSON response
            capabilities_list = [cap.dict() for cap in capabilities]
            
            # Statistics
            df_count = sum(1 for cap in capabilities if cap.supports_df)
            tdoa_count = sum(1 for cap in capabilities if cap.supports_tdoa)
            
            return {
                'success': True,
                'capabilities': capabilities_list,
                'summary': {
                    'total_stations': len(capabilities),
                    'df_capable': df_count,
                    'tdoa_capable': tdoa_count
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting station capabilities: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/df-measurement")
    async def create_df_measurement(
        request: DFMeasurementRequest,
        current_user: User = Depends(get_current_user)
    ):
        """
        Create a Direction Finding (DF) measurement order
        
        Generates XML orders for multiple stations to perform DF measurements
        and determine bearing to signal source
        """
        try:
            if len(request.station_ids) < 2:
                raise HTTPException(
                    status_code=400,
                    detail="At least 2 stations required for DF measurement"
                )
            
            # Generate measurement ID
            measurement_id = str(uuid.uuid4())
            order_ids = []
            
            # Create XML order for each station
            for station_id in request.station_ids:
                order_id = xml_processor.generate_order_id(prefix="DF")
                
                # Build DF measurement configuration
                config = {
                    "name": f"DF_Measurement_{station_id}",
                    "task": "FFM",  # Fixed frequency with DF
                    "freq_mode": "S",
                    "freq_single": request.frequency,
                    "station_name": station_id,
                    "if_bandwidth": request.bandwidth,
                    "meas_time": request.measurement_time,
                    "detect_type": request.detector,
                    "priority": "NORMAL" if request.priority == 2 else ("HIGH" if request.priority == 3 else "LOW"),
                    "result_type": "MR",
                    # DF-specific parameters
                    "measurement_type": "DF",
                    "df_enabled": True
                }
                
                # Generate XML order
                xml_content = xml_processor.create_measurement_order(
                    order_id=order_id,
                    config=config,
                    sender=os.getenv("ARGUS_CONTROL_STATION", "HQ4"),
                    sender_pc=os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
                )
                
                # Save to inbox
                xml_file = xml_processor.save_request(xml_content, order_id)
                order_ids.append(order_id)
                
                # Store order in MongoDB
                await db.location_measurements.insert_one({
                    'id': measurement_id,
                    'order_id': order_id,
                    'measurement_type': 'DF',
                    'station_id': station_id,
                    'frequency': request.frequency,
                    'created_by': current_user.username,
                    'created_at': datetime.utcnow().isoformat(),
                    'status': 'submitted',
                    'xml_file': xml_file
                })
            
            logger.info(f"DF measurement created: {measurement_id} with {len(order_ids)} orders by {current_user.username}")
            
            return {
                'success': True,
                'measurement_id': measurement_id,
                'measurement_type': 'DF',
                'order_ids': order_ids,
                'station_count': len(request.station_ids),
                'frequency': f"{request.frequency/1e6:.3f} MHz",
                'message': f'DF measurement orders submitted for {len(request.station_ids)} stations'
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating DF measurement: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/tdoa-measurement")
    async def create_tdoa_measurement(
        request: TDOAMeasurementRequest,
        current_user: User = Depends(get_current_user)
    ):
        """
        Create a TDOA measurement order
        
        Generates synchronized XML orders for multiple TDOA-capable stations
        to perform time difference measurements
        """
        try:
            if len(request.station_ids) < 3:
                raise HTTPException(
                    status_code=400,
                    detail="At least 3 stations required for TDOA measurement"
                )
            
            # Generate measurement ID
            measurement_id = str(uuid.uuid4())
            order_ids = []
            
            # Create synchronized XML orders for each station
            for station_id in request.station_ids:
                order_id = xml_processor.generate_order_id(prefix="TDOA")
                
                # Build TDOA measurement configuration
                config = {
                    "name": f"TDOA_Measurement_{station_id}",
                    "task": "FFM",  # Fixed frequency with TDOA
                    "freq_mode": "S",
                    "freq_single": request.frequency,
                    "station_name": station_id,
                    "if_bandwidth": request.bandwidth,
                    "meas_time": request.measurement_time,
                    "detect_type": request.detector,
                    "priority": "NORMAL" if request.priority == 2 else ("HIGH" if request.priority == 3 else "LOW"),
                    "result_type": "MR",
                    # TDOA-specific parameters
                    "measurement_type": "TDOA",
                    "tdoa_enabled": True,
                    "tdoa_sync": True,
                    "tdoa_measurement_id": measurement_id
                }
                
                # Generate XML order
                xml_content = xml_processor.create_measurement_order(
                    order_id=order_id,
                    config=config,
                    sender=os.getenv("ARGUS_CONTROL_STATION", "HQ4"),
                    sender_pc=os.getenv("ARGUS_SENDER_PC", "SRVARGUS")
                )
                
                # Save to inbox
                xml_file = xml_processor.save_request(xml_content, order_id)
                order_ids.append(order_id)
                
                # Store order in MongoDB
                await db.location_measurements.insert_one({
                    'id': measurement_id,
                    'order_id': order_id,
                    'measurement_type': 'TDOA',
                    'station_id': station_id,
                    'frequency': request.frequency,
                    'created_by': current_user.username,
                    'created_at': datetime.utcnow().isoformat(),
                    'status': 'submitted',
                    'xml_file': xml_file
                })
            
            logger.info(f"TDOA measurement created: {measurement_id} with {len(order_ids)} orders by {current_user.username}")
            
            return {
                'success': True,
                'measurement_id': measurement_id,
                'measurement_type': 'TDOA',
                'order_ids': order_ids,
                'station_count': len(request.station_ids),
                'frequency': f"{request.frequency/1e6:.3f} MHz",
                'message': f'TDOA measurement orders submitted for {len(request.station_ids)} stations'
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating TDOA measurement: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/results/{measurement_id}")
    async def get_location_measurement_results(
        measurement_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """
        Get results for a location measurement (DF or TDOA)
        
        Returns processed bearing data, TDOA hyperbolas, and calculated position
        """
        try:
            # Get all orders for this measurement
            orders = await db.location_measurements.find({
                'id': measurement_id
            }).to_list(length=None)
            
            if not orders:
                raise HTTPException(
                    status_code=404,
                    detail=f"Measurement {measurement_id} not found"
                )
            
            # Get measurement type
            measurement_type = orders[0]['measurement_type']
            
            # Get results for each order
            # TODO: Parse actual measurement results from XML responses
            # For now, return order status
            
            results = {
                'measurement_id': measurement_id,
                'measurement_type': measurement_type,
                'station_count': len(orders),
                'orders': []
            }
            
            for order in orders:
                if '_id' in order:
                    del order['_id']
                results['orders'].append(order)
            
            return {
                'success': True,
                'results': results
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting measurement results: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/measurements")
    async def list_location_measurements(
        limit: int = 50,
        measurement_type: Optional[str] = None,
        current_user: User = Depends(get_current_user)
    ):
        """
        List location measurements
        
        Optionally filter by measurement type (DF or TDOA)
        """
        try:
            query = {}
            if measurement_type:
                query['measurement_type'] = measurement_type.upper()
            
            # Get unique measurements
            pipeline = [
                {'$match': query},
                {'$group': {
                    '_id': '$id',
                    'measurement_type': {'$first': '$measurement_type'},
                    'frequency': {'$first': '$frequency'},
                    'created_by': {'$first': '$created_by'},
                    'created_at': {'$first': '$created_at'},
                    'station_count': {'$sum': 1}
                }},
                {'$sort': {'created_at': -1}},
                {'$limit': limit}
            ]
            
            measurements = await db.location_measurements.aggregate(pipeline).to_list(length=limit)
            
            # Format results
            for m in measurements:
                m['measurement_id'] = m.pop('_id')
            
            return {
                'success': True,
                'measurements': measurements,
                'count': len(measurements)
            }
            
        except Exception as e:
            logger.error(f"Error listing measurements: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
