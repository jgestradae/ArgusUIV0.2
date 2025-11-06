"""
Real-time capture handler for ORM-ADC streaming data
Handles UDP data capture, storage, and WebSocket broadcasting
"""
import asyncio
import os
import shutil
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import uuid

from orm_adc_client import UDPDataParser

logger = logging.getLogger(__name__)

# Storage configuration
CAPTURE_BASE_PATH = Path("/tmp/argus_processed")
CAPTURE_RETENTION_DAYS = 10
DISK_WARNING_THRESHOLD = 0.90  # 90%

# WebSocket connections
active_websocket_connections: List = []


class CaptureHandler:
    """Handles capture, storage, and broadcasting of ORM-ADC data"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.parser = UDPDataParser()
        
        # Ensure storage directory exists
        CAPTURE_BASE_PATH.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Capture handler initialized, storage: {CAPTURE_BASE_PATH}")
    
    async def handle_udp_data(self, data: bytes, addr: tuple):
        """
        Process incoming UDP data packet
        
        Args:
            data: Raw UDP packet data
            addr: (host, port) tuple
        """
        try:
            timestamp = datetime.now(timezone.utc)
            capture_id = str(uuid.uuid4())
            
            # Try to parse as spectrum data
            parsed_spectrum = self.parser.parse_spectrum_data(data)
            
            # If not spectrum, try IF data
            parsed_if = None
            if not parsed_spectrum:
                parsed_if = self.parser.parse_if_data(data)
            
            parsed_data = parsed_spectrum or parsed_if
            
            # Save raw data to file
            raw_file_path = await self._save_raw_data(
                data, 
                capture_id, 
                timestamp,
                addr[0]
            )
            
            # Store metadata in MongoDB
            await self._store_capture_metadata(
                capture_id,
                'udp',
                addr[0],
                addr[1],
                timestamp,
                len(data),
                raw_file_path,
                parsed_data
            )
            
            # Broadcast to WebSocket clients
            await self._broadcast_capture(
                capture_id,
                'udp',
                addr,
                parsed_data,
                raw_file_path,
                len(data)
            )
            
            logger.debug(f"UDP capture processed: {capture_id}")
            
        except Exception as e:
            logger.error(f"Error handling UDP data: {str(e)}")
    
    async def _save_raw_data(
        self, 
        data: bytes, 
        capture_id: str, 
        timestamp: datetime,
        source: str
    ) -> str:
        """
        Save raw capture data to disk
        
        Returns:
            File path where data was saved
        """
        try:
            # Create directory structure: /tmp/argus_processed/YYYY-MM-DD/source/
            date_dir = timestamp.strftime("%Y-%m-%d")
            target_dir = CAPTURE_BASE_PATH / date_dir / source.replace('.', '_')
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file
            filename = f"{capture_id}_{timestamp.strftime('%H%M%S')}.bin"
            file_path = target_dir / filename
            
            with open(file_path, 'wb') as f:
                f.write(data)
            
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving raw data: {str(e)}")
            return ""
    
    async def _store_capture_metadata(
        self,
        capture_id: str,
        protocol: str,
        remote_addr: str,
        remote_port: int,
        timestamp: datetime,
        size_bytes: int,
        raw_file_path: str,
        parsed_data: Optional[Dict[str, Any]]
    ):
        """Store capture metadata in MongoDB"""
        try:
            doc = {
                'id': capture_id,
                'protocol': protocol,
                'remote_addr': remote_addr,
                'remote_port': remote_port,
                'timestamp': timestamp.isoformat(),
                'size_bytes': size_bytes,
                'raw_file_path': raw_file_path,
                'parsed': parsed_data is not None,
                'data_type': parsed_data.get('type') if parsed_data else 'unknown',
                'sample_preview': str(parsed_data)[:500] if parsed_data else None
            }
            
            await self.db.captures_raw.insert_one(doc)
            
        except Exception as e:
            logger.error(f"Error storing capture metadata: {str(e)}")
    
    async def _broadcast_capture(
        self,
        capture_id: str,
        protocol: str,
        addr: tuple,
        parsed_data: Optional[Dict[str, Any]],
        raw_path: str,
        size_bytes: int
    ):
        """Broadcast capture to WebSocket clients"""
        try:
            message = {
                'event': 'capture.received',
                'capture_id': capture_id,
                'protocol': protocol,
                'host': addr[0],
                'port': addr[1],
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'size_bytes': size_bytes,
                'parsed': parsed_data,
                'raw_path': raw_path
            }
            
            # Send to all connected WebSocket clients
            if active_websocket_connections:
                disconnected = []
                for ws in active_websocket_connections:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        logger.warning(f"WebSocket send failed: {str(e)}")
                        disconnected.append(ws)
                
                # Remove disconnected clients
                for ws in disconnected:
                    active_websocket_connections.remove(ws)
            
        except Exception as e:
            logger.error(f"Error broadcasting capture: {str(e)}")
    
    async def cleanup_old_captures(self):
        """
        Delete captures older than CAPTURE_RETENTION_DAYS
        Run periodically as background task
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=CAPTURE_RETENTION_DAYS)
            
            deleted_files = 0
            deleted_size = 0
            
            # Iterate through date directories
            for date_dir in CAPTURE_BASE_PATH.iterdir():
                if not date_dir.is_dir():
                    continue
                
                try:
                    # Parse directory name as date (YYYY-MM-DD)
                    dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
                    
                    if dir_date < cutoff_date:
                        # Delete entire directory
                        dir_size = sum(
                            f.stat().st_size 
                            for f in date_dir.rglob('*') 
                            if f.is_file()
                        )
                        
                        shutil.rmtree(date_dir)
                        deleted_files += sum(1 for _ in date_dir.rglob('*'))
                        deleted_size += dir_size
                        
                        logger.info(f"Deleted old captures: {date_dir.name}")
                        
                except ValueError:
                    # Not a date directory, skip
                    continue
            
            # Delete old MongoDB records
            cutoff_iso = cutoff_date.isoformat()
            result = await self.db.captures_raw.delete_many({
                'timestamp': {'$lt': cutoff_iso}
            })
            
            logger.info(
                f"Cleanup complete: {deleted_files} files, "
                f"{deleted_size / (1024*1024):.2f} MB, "
                f"{result.deleted_count} DB records"
            )
            
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")
    
    async def check_disk_space(self) -> Dict[str, Any]:
        """
        Check disk space and return status
        
        Returns:
            Dictionary with disk usage info
        """
        try:
            stat = shutil.disk_usage(CAPTURE_BASE_PATH)
            
            total = stat.total
            used = stat.used
            free = stat.free
            percent_used = used / total if total > 0 else 0
            
            status = {
                'total_gb': total / (1024**3),
                'used_gb': used / (1024**3),
                'free_gb': free / (1024**3),
                'percent_used': percent_used,
                'warning': percent_used >= DISK_WARNING_THRESHOLD,
                'threshold': DISK_WARNING_THRESHOLD
            }
            
            if status['warning']:
                logger.warning(
                    f"Disk space warning: {percent_used*100:.1f}% used "
                    f"({free/(1024**3):.2f} GB free)"
                )
            
            return status
            
        except Exception as e:
            logger.error(f"Disk check error: {str(e)}")
            return {
                'error': str(e),
                'warning': False
            }


async def cleanup_task(db: AsyncIOMotorDatabase):
    """Background task to cleanup old captures daily"""
    handler = CaptureHandler(db)
    
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            await handler.cleanup_old_captures()
            await handler.check_disk_space()
        except Exception as e:
            logger.error(f"Cleanup task error: {str(e)}")
            await asyncio.sleep(60)
