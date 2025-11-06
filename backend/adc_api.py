"""
ADC API endpoints for ORM-ADC operations
Handles order creation and UDP capture management
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import os

from auth import get_current_user
from models import User
from adc_order_generator import ADCOrderGenerator
from udp_listener import UDPListener

logger = logging.getLogger(__name__)

# Global UDP listener instance
udp_listener: Optional[UDPListener] = None
active_websockets: List[WebSocket] = []


class ScanOrderRequest(BaseModel):
    """Request model for SCAN order"""
    station_id: str = Field(..., description="Target station name")
    freq_start: float = Field(..., description="Start frequency in Hz", gt=0)
    freq_stop: float = Field(..., description="Stop frequency in Hz", gt=0)
    freq_step: float = Field(25000, description="Frequency step in Hz", gt=0)
    bandwidth: float = Field(10000, description="Resolution bandwidth in Hz", gt=0)
    detector: str = Field("RMS", description="Detector type: RMS, Peak, AVG")
    priority: int = Field(1, description="Priority: 1=LOW, 2=NORMAL, 3=HIGH", ge=1, le=3)
    meas_time: float = Field(-1, description="Measurement time in ms (-1 for auto)")
    attenuation: str = Field("Auto", description="RF attenuation (Auto or dB value)")


class SingleFreqOrderRequest(BaseModel):
    """Request model for single frequency measurement"""
    station_id: str = Field(..., description="Target station name")
    frequency: float = Field(..., description="Measurement frequency in Hz", gt=0)
    bandwidth: float = Field(10000, description="Resolution bandwidth in Hz", gt=0)
    detector: str = Field("RMS", description="Detector type: RMS, Peak, AVG")
    priority: int = Field(1, description="Priority: 1=LOW, 2=NORMAL, 3=HIGH", ge=1, le=3)
    meas_time: float = Field(1000, description="Measurement time in ms", gt=0)
    attenuation: str = Field("Auto", description="RF attenuation (Auto or dB value)")
    measurement_type: str = Field("LEVEL", description="Measurement type: LEVEL, DF, DEMOD, SPECTRUM")


def create_adc_router(db, adc_generator: ADCOrderGenerator) -> APIRouter:
    """Create and configure ADC API router"""
    
    router = APIRouter(prefix="/api/adc", tags=["ADC"])
    
    global udp_listener
    udp_listener = UDPListener(port=4090, db=db)
    
    @router.post("/orders/scan")
    async def create_scan_order(
        request: ScanOrderRequest,
        current_user: User = Depends(get_current_user)
    ):
        """
        Create and submit a SCAN order to Argus INBOX
        
        This generates an ADC-compatible XML order for frequency scanning
        and writes it to the Argus INBOX directory where it will be
        automatically detected and executed.
        """
        try:
            # Validate frequency range
            if request.freq_stop <= request.freq_start:
                raise HTTPException(
                    status_code=400,
                    detail="Stop frequency must be greater than start frequency"
                )
            
            # Generate order ID
            order_id = adc_generator.generate_order_id(prefix="SCAN")
            
            # Create XML order
            xml_order = adc_generator.create_scan_order(
                order_id=order_id,
                station_id=request.station_id,
                freq_start=request.freq_start,
                freq_stop=request.freq_stop,
                freq_step=request.freq_step,
                bandwidth=request.bandwidth,
                detector=request.detector,
                priority=request.priority,
                meas_time=request.meas_time,
                attenuation=request.attenuation
            )
            
            # Save to INBOX
            result = adc_generator.save_order_to_inbox(xml_order, order_id)
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('error', 'Failed to save order'))
            
            # Store order metadata in MongoDB
            await db.adc_orders.insert_one({
                'id': order_id,
                'type': 'SCAN',
                'station_id': request.station_id,
                'freq_start': request.freq_start,
                'freq_stop': request.freq_stop,
                'freq_step': request.freq_step,
                'bandwidth': request.bandwidth,
                'detector': request.detector,
                'priority': request.priority,
                'created_by': current_user.username,
                'created_at': datetime.utcnow().isoformat(),
                'status': 'submitted',
                'inbox_path': result['inbox_path']
            })
            
            logger.info(f"SCAN order created: {order_id} by {current_user.username}")
            
            return {
                'success': True,
                'order_id': order_id,
                'order_type': 'SCAN',
                'station_id': request.station_id,
                'freq_range': f"{request.freq_start/1e6:.3f} - {request.freq_stop/1e6:.3f} MHz",
                'inbox_path': result['inbox_path'],
                'message': 'Order submitted to Argus INBOX successfully'
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating SCAN order: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/orders/single-freq")
    async def create_single_freq_order(
        request: SingleFreqOrderRequest,
        current_user: User = Depends(get_current_user)
    ):
        """
        Create and submit a single frequency measurement order to Argus INBOX
        
        This generates an ADC-compatible XML order for measuring a single
        frequency and writes it to the Argus INBOX directory.
        """
        try:
            # Generate order ID
            order_id = adc_generator.generate_order_id(prefix="MEAS")
            
            # Create XML order
            xml_order = adc_generator.create_single_freq_order(
                order_id=order_id,
                station_id=request.station_id,
                frequency=request.frequency,
                bandwidth=request.bandwidth,
                detector=request.detector,
                priority=request.priority,
                meas_time=request.meas_time,
                attenuation=request.attenuation,
                measurement_type=request.measurement_type
            )
            
            # Save to INBOX
            result = adc_generator.save_order_to_inbox(xml_order, order_id)
            
            if not result['success']:
                raise HTTPException(status_code=500, detail=result.get('error', 'Failed to save order'))
            
            # Store order metadata in MongoDB
            await db.adc_orders.insert_one({
                'id': order_id,
                'type': 'SINGLE_FREQ',
                'station_id': request.station_id,
                'frequency': request.frequency,
                'bandwidth': request.bandwidth,
                'detector': request.detector,
                'measurement_type': request.measurement_type,
                'priority': request.priority,
                'created_by': current_user.username,
                'created_at': datetime.utcnow().isoformat(),
                'status': 'submitted',
                'inbox_path': result['inbox_path']
            })
            
            logger.info(f"Single freq order created: {order_id} by {current_user.username}")
            
            return {
                'success': True,
                'order_id': order_id,
                'order_type': 'SINGLE_FREQ',
                'station_id': request.station_id,
                'frequency': f"{request.frequency/1e6:.3f} MHz",
                'inbox_path': result['inbox_path'],
                'message': 'Order submitted to Argus INBOX successfully'
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating single freq order: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/capture/start")
    async def start_udp_capture(current_user: dict = Depends(get_current_user)):
        """
        Start UDP listener for real-time data capture
        
        Begins listening on UDP port 4090 for measurement results from Argus.
        Only one capture session can be active at a time.
        """
        try:
            global udp_listener
            
            if udp_listener.is_running():
                return {
                    'success': True,
                    'message': 'UDP capture already running',
                    'port': 4090,
                    'status': 'active'
                }
            
            # Start UDP listener with WebSocket broadcast callback
            async def broadcast_callback(capture_data: Dict[str, Any]):
                """Broadcast capture data to all connected WebSocket clients"""
                if active_websockets:
                    message = {
                        'event': 'capture.received',
                        'data': capture_data
                    }
                    
                    disconnected = []
                    for ws in active_websockets:
                        try:
                            await ws.send_json(message)
                        except Exception as e:
                            logger.warning(f"WebSocket send failed: {str(e)}")
                            disconnected.append(ws)
                    
                    # Remove disconnected clients
                    for ws in disconnected:
                        active_websockets.remove(ws)
            
            await udp_listener.start(callback=broadcast_callback)
            
            logger.info(f"UDP capture started by {current_user['username']}")
            
            return {
                'success': True,
                'message': 'UDP capture started successfully',
                'port': 4090,
                'status': 'active'
            }
            
        except Exception as e:
            logger.error(f"Error starting UDP capture: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/capture/stop")
    async def stop_udp_capture(current_user: dict = Depends(get_current_user)):
        """
        Stop UDP listener
        
        Stops the UDP listener and closes all WebSocket connections.
        """
        try:
            global udp_listener
            
            if not udp_listener.is_running():
                return {
                    'success': True,
                    'message': 'UDP capture not running',
                    'status': 'inactive'
                }
            
            await udp_listener.stop()
            
            # Close all WebSocket connections
            for ws in active_websockets[:]:
                try:
                    await ws.close()
                except:
                    pass
                active_websockets.remove(ws)
            
            logger.info(f"UDP capture stopped by {current_user['username']}")
            
            return {
                'success': True,
                'message': 'UDP capture stopped successfully',
                'status': 'inactive'
            }
            
        except Exception as e:
            logger.error(f"Error stopping UDP capture: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/capture/status")
    async def get_capture_status(current_user: dict = Depends(get_current_user)):
        """Get current UDP capture status"""
        global udp_listener
        
        is_running = udp_listener.is_running() if udp_listener else False
        
        return {
            'status': 'active' if is_running else 'inactive',
            'port': 4090,
            'is_listening': is_running,
            'websocket_clients': len(active_websockets)
        }
    
    @router.get("/orders")
    async def get_adc_orders(
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """Get list of ADC orders"""
        try:
            orders = await db.adc_orders.find().sort('created_at', -1).limit(limit).to_list(length=limit)
            
            return {
                'success': True,
                'orders': orders,
                'count': len(orders)
            }
            
        except Exception as e:
            logger.error(f"Error fetching ADC orders: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/captures")
    async def get_captures(
        limit: int = 100,
        current_user: dict = Depends(get_current_user)
    ):
        """Get list of captured UDP data"""
        try:
            captures = await db.captures_raw.find().sort('timestamp', -1).limit(limit).to_list(length=limit)
            
            return {
                'success': True,
                'captures': captures,
                'count': len(captures)
            }
            
        except Exception as e:
            logger.error(f"Error fetching captures: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.websocket("/ws/stream")
    async def websocket_endpoint(websocket: WebSocket):
        """
        WebSocket endpoint for real-time data streaming
        
        Clients connect here to receive real-time updates of captured UDP data.
        """
        await websocket.accept()
        active_websockets.append(websocket)
        
        logger.info(f"WebSocket client connected, total clients: {len(active_websockets)}")
        
        try:
            # Send initial status
            await websocket.send_json({
                'event': 'connected',
                'message': 'Connected to ADC data stream',
                'capture_status': 'active' if udp_listener.is_running() else 'inactive'
            })
            
            # Keep connection alive
            while True:
                # Wait for messages from client (ping/pong)
                try:
                    data = await websocket.receive_text()
                    if data == 'ping':
                        await websocket.send_json({'event': 'pong'})
                except WebSocketDisconnect:
                    break
                    
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
        finally:
            if websocket in active_websockets:
                active_websockets.remove(websocket)
            logger.info(f"WebSocket client disconnected, remaining clients: {len(active_websockets)}")
    
    return router
