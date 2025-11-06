"""
UDP Listener for ADC Real-Time Data Capture
Listens on UDP port 4090 for measurement results from Argus
Parses XML and binary data, stores in MongoDB, broadcasts via WebSocket
"""
import asyncio
import socket
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable
import uuid
import struct

logger = logging.getLogger(__name__)

# Storage configuration
UDP_CAPTURE_PATH = Path("/tmp/argus_processed/udp_captures")

class UDPListener:
    """Listens for UDP data from Argus on port 4090"""
    
    def __init__(self, port: int = 4090, db=None):
        self.port = port
        self.db = db
        self.is_listening = False
        self.sock = None
        self.capture_task = None
        self.data_callback: Optional[Callable] = None
        
        # Ensure storage directory exists
        UDP_CAPTURE_PATH.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"UDP Listener initialized for port {port}")
    
    async def start(self, callback: Optional[Callable] = None):
        """
        Start UDP listener
        
        Args:
            callback: Optional callback function for each received packet
        """
        if self.is_listening:
            logger.warning("UDP listener already running")
            return
        
        self.data_callback = callback
        self.is_listening = True
        
        try:
            # Create UDP socket
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.sock.bind(('0.0.0.0', self.port))
            self.sock.setblocking(False)
            
            logger.info(f"UDP listener started on port {self.port}")
            
            # Start capture loop
            self.capture_task = asyncio.create_task(self._capture_loop())
            
        except Exception as e:
            logger.error(f"Failed to start UDP listener: {str(e)}")
            self.is_listening = False
            raise
    
    async def stop(self):
        """Stop UDP listener"""
        self.is_listening = False
        
        if self.capture_task:
            self.capture_task.cancel()
            try:
                await self.capture_task
            except asyncio.CancelledError:
                pass
        
        if self.sock:
            self.sock.close()
            self.sock = None
        
        logger.info("UDP listener stopped")
    
    async def _capture_loop(self):
        """Main capture loop"""
        loop = asyncio.get_event_loop()
        
        while self.is_listening:
            try:
                # Receive UDP packet (non-blocking)
                data, addr = await loop.sock_recvfrom(self.sock, 65536)
                
                if data:
                    # Process packet
                    await self._process_packet(data, addr)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"UDP receive error: {str(e)}")
                await asyncio.sleep(0.1)
    
    async def _process_packet(self, data: bytes, addr: tuple):
        """
        Process received UDP packet
        
        Args:
            data: Raw packet data
            addr: (host, port) tuple
        """
        try:
            capture_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc)
            
            # Save raw data
            raw_file = await self._save_raw_data(data, capture_id, timestamp)
            
            # Try to parse data
            parsed_data = await self._parse_data(data)
            
            # Store in MongoDB if available
            if self.db:
                await self._store_capture(
                    capture_id,
                    timestamp,
                    addr,
                    len(data),
                    raw_file,
                    parsed_data
                )
            
            # Call callback if provided
            if self.data_callback:
                await self.data_callback({
                    'capture_id': capture_id,
                    'timestamp': timestamp.isoformat(),
                    'addr': addr,
                    'size_bytes': len(data),
                    'parsed': parsed_data,
                    'raw_file': raw_file
                })
            
            logger.debug(f"UDP packet processed: {capture_id} from {addr[0]}:{addr[1]}")
            
        except Exception as e:
            logger.error(f"Error processing UDP packet: {str(e)}")
    
    async def _save_raw_data(self, data: bytes, capture_id: str, timestamp: datetime) -> str:
        """
        Save raw UDP data to disk
        
        Returns:
            File path where data was saved
        """
        try:
            # Create date-based directory structure
            date_dir = timestamp.strftime("%Y-%m-%d")
            target_dir = UDP_CAPTURE_PATH / date_dir
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
    
    async def _parse_data(self, data: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse UDP data (XML or binary)
        
        Returns:
            Parsed data dictionary or None
        """
        try:
            # Try to parse as XML first
            if data.strip().startswith(b'<?xml'):
                return self._parse_xml_data(data)
            else:
                # Try to parse as binary spectrum data
                return self._parse_binary_data(data)
                
        except Exception as e:
            logger.error(f"Data parsing error: {str(e)}")
            return None
    
    def _parse_xml_data(self, data: bytes) -> Dict[str, Any]:
        """
        Parse XML measurement result
        
        Returns:
            Dictionary with parsed XML data
        """
        try:
            xml_str = data.decode('utf-8')
            root = ET.fromstring(xml_str)
            
            result = {
                'type': 'xml',
                'format': 'measurement_result'
            }
            
            # Parse HEADER
            header = root.find('.//HEADER')
            if header is not None:
                result['order_id'] = self._get_text(header, 'ID')
                result['command'] = self._get_text(header, 'CMD')
                result['status'] = self._get_text(header, 'STATUS')
            
            # Parse measurement results
            freq_res_list = []
            for freq_res in root.findall('.//FREQ_RES'):
                freq_data = {
                    'frequency': self._get_text(freq_res, 'FREQ'),
                    'level': self._get_text(freq_res, 'LEVEL'),
                    'timestamp': self._get_text(freq_res, 'TIMESTAMP')
                }
                freq_res_list.append(freq_data)
            
            if freq_res_list:
                result['measurements'] = freq_res_list
                result['count'] = len(freq_res_list)
            
            return result
            
        except Exception as e:
            logger.error(f"XML parsing error: {str(e)}")
            return {'type': 'xml', 'parse_error': str(e)}
    
    def _parse_binary_data(self, data: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse binary spectrum data
        
        Binary format (simplified):
        - 4 bytes: packet type ID
        - 4 bytes: data length
        - 8 bytes: frequency start (double)
        - 8 bytes: frequency step (double)
        - 4 bytes: number of points
        - N * 4 bytes: level values (float)
        
        Returns:
            Dictionary with parsed spectrum data or None
        """
        try:
            if len(data) < 28:  # Minimum header size
                return None
            
            # Parse header
            packet_type = struct.unpack('>I', data[0:4])[0]
            data_length = struct.unpack('>I', data[4:8])[0]
            freq_start = struct.unpack('>d', data[8:16])[0]
            freq_step = struct.unpack('>d', data[16:24])[0]
            num_points = struct.unpack('>I', data[24:28])[0]
            
            # Parse spectrum values
            values = []
            values_offset = 28
            
            for i in range(min(num_points, 10000)):  # Limit to 10000 points
                offset = values_offset + (i * 4)
                if offset + 4 <= len(data):
                    value = struct.unpack('>f', data[offset:offset+4])[0]
                    values.append(float(value))
                else:
                    break
            
            return {
                'type': 'binary',
                'format': 'spectrum',
                'packet_type': packet_type,
                'frequency_start': freq_start,
                'frequency_step': freq_step,
                'num_points': len(values),
                'levels': values
            }
            
        except Exception as e:
            logger.error(f"Binary parsing error: {str(e)}")
            return None
    
    def _get_text(self, parent: ET.Element, tag: str) -> Optional[str]:
        """Safely extract text from XML element"""
        elem = parent.find(tag)
        return elem.text if elem is not None else None
    
    async def _store_capture(
        self,
        capture_id: str,
        timestamp: datetime,
        addr: tuple,
        size_bytes: int,
        raw_file: str,
        parsed_data: Optional[Dict[str, Any]]
    ):
        """Store capture metadata in MongoDB"""
        try:
            doc = {
                'id': capture_id,
                'timestamp': timestamp.isoformat(),
                'source_addr': addr[0],
                'source_port': addr[1],
                'size_bytes': size_bytes,
                'raw_file': raw_file,
                'parsed': parsed_data is not None,
                'data_type': parsed_data.get('type') if parsed_data else 'unknown',
                'format': parsed_data.get('format') if parsed_data else None,
                'data': parsed_data
            }
            
            await self.db.captures_raw.insert_one(doc)
            logger.debug(f"Capture metadata stored: {capture_id}")
            
        except Exception as e:
            logger.error(f"Error storing capture metadata: {str(e)}")
    
    def is_running(self) -> bool:
        """Check if listener is running"""
        return self.is_listening
