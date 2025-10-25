"""
ACD (Argus Communication Device) Module
Handles UDP communication with Argus for real-time measurement results
"""

import asyncio
import socket
import struct
import logging
from datetime import datetime
from typing import Optional, Callable, Dict, Any
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class ACDProtocol:
    """ACD Protocol Handler for UDP communication with Argus"""
    
    # ACD Message Types
    MSG_TYPE_MEASUREMENT_RESULT = 0x01
    MSG_TYPE_STATUS = 0x02
    MSG_TYPE_ERROR = 0x03
    MSG_TYPE_ACKNOWLEDGMENT = 0x04
    
    def __init__(self, host: str = "0.0.0.0", port: int = 9876):
        """
        Initialize ACD Protocol Handler
        
        Args:
            host: IP address to bind UDP socket (default: 0.0.0.0 for all interfaces)
            port: UDP port to listen on (default: 9876, configurable in Argus)
        """
        self.host = host
        self.port = port
        self.socket: Optional[socket.socket] = None
        self.running = False
        self.callback: Optional[Callable] = None
        
    def set_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """
        Set callback function for received messages
        
        Args:
            callback: Function to call when message is received
        """
        self.callback = callback
        
    async def start(self):
        """Start UDP listener"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.socket.bind((self.host, self.port))
            self.socket.setblocking(False)
            self.running = True
            
            logger.info(f"ACD UDP listener started on {self.host}:{self.port}")
            
            # Start listening loop
            await self._listen_loop()
            
        except Exception as e:
            logger.error(f"Error starting ACD listener: {e}")
            raise
            
    async def _listen_loop(self):
        """Main listening loop"""
        loop = asyncio.get_event_loop()
        
        while self.running:
            try:
                # Receive UDP packet (non-blocking)
                data, addr = await loop.sock_recvfrom(self.socket, 65536)
                
                if data:
                    logger.debug(f"Received {len(data)} bytes from {addr}")
                    # Process message
                    await self._process_message(data, addr)
                    
            except asyncio.CancelledError:
                logger.info("ACD listener cancelled")
                break
            except Exception as e:
                logger.error(f"Error in ACD listen loop: {e}")
                await asyncio.sleep(0.1)  # Prevent tight loop on error
                
    async def _process_message(self, data: bytes, addr: tuple):
        """
        Process received ACD message
        
        Args:
            data: Raw message bytes
            addr: Sender address (host, port)
        """
        try:
            # Parse ACD message header
            if len(data) < 12:
                logger.warning(f"Message too short from {addr}: {len(data)} bytes")
                return
                
            # ACD Header Format (12 bytes):
            # - Magic: 4 bytes (0x41434400 = "ACD\0")
            # - Message Type: 2 bytes
            # - Message Length: 2 bytes
            # - Sequence Number: 4 bytes
            
            magic, msg_type, msg_length, seq_num = struct.unpack('>IHHi', data[:12])
            
            # Verify magic number
            if magic != 0x41434400:
                logger.warning(f"Invalid magic number from {addr}: {hex(magic)}")
                return
                
            # Extract payload
            payload = data[12:12+msg_length]
            
            # Parse based on message type
            if msg_type == self.MSG_TYPE_MEASUREMENT_RESULT:
                result = self._parse_measurement_result(payload)
                result['source_addr'] = addr
                result['sequence_number'] = seq_num
                result['timestamp'] = datetime.now()
                
                # Call callback if set
                if self.callback:
                    await self.callback(result)
                    
            elif msg_type == self.MSG_TYPE_STATUS:
                logger.info(f"Status message from {addr}: {payload.decode('utf-8', errors='ignore')}")
                
            elif msg_type == self.MSG_TYPE_ERROR:
                logger.error(f"Error message from {addr}: {payload.decode('utf-8', errors='ignore')}")
                
            elif msg_type == self.MSG_TYPE_ACKNOWLEDGMENT:
                logger.debug(f"ACK from {addr}, seq: {seq_num}")
                
            else:
                logger.warning(f"Unknown message type from {addr}: {msg_type}")
                
        except Exception as e:
            logger.error(f"Error processing ACD message: {e}")
            
    def _parse_measurement_result(self, payload: bytes) -> Dict[str, Any]:
        """
        Parse measurement result payload
        
        Args:
            payload: Message payload bytes
            
        Returns:
            Dictionary with parsed measurement data
        """
        try:
            # Check if payload is XML or binary
            if payload.startswith(b'<?xml') or payload.startswith(b'<'):
                # XML format
                return self._parse_xml_result(payload)
            else:
                # Binary format
                return self._parse_binary_result(payload)
                
        except Exception as e:
            logger.error(f"Error parsing measurement result: {e}")
            return {'error': str(e), 'raw_data': payload.hex()}
            
    def _parse_xml_result(self, payload: bytes) -> Dict[str, Any]:
        """Parse XML measurement result"""
        try:
            xml_str = payload.decode('utf-8')
            root = ET.fromstring(xml_str)
            
            result = {
                'format': 'xml',
                'order_id': root.findtext('.//ORDER_ID'),
                'measurement_type': root.findtext('.//MEAS_TYPE'),
                'frequency': root.findtext('.//FREQUENCY'),
                'level': root.findtext('.//LEVEL'),
                'bandwidth': root.findtext('.//BANDWIDTH'),
                'station': root.findtext('.//STATION'),
                'device': root.findtext('.//DEVICE'),
            }
            
            # Parse additional fields based on measurement type
            for elem in root.iter():
                if elem.tag not in ['ORDER_ID', 'MEAS_TYPE', 'FREQUENCY', 'LEVEL', 'BANDWIDTH', 'STATION', 'DEVICE']:
                    if elem.text:
                        result[elem.tag.lower()] = elem.text
                        
            return result
            
        except Exception as e:
            logger.error(f"Error parsing XML result: {e}")
            return {'error': str(e), 'raw_xml': payload.decode('utf-8', errors='ignore')}
            
    def _parse_binary_result(self, payload: bytes) -> Dict[str, Any]:
        """
        Parse binary measurement result
        
        Binary format (varies by measurement type):
        FFM: freq(8), level(4), bandwidth(4), time(8)
        SCAN: num_points(4), [freq(8), level(4)]*N
        """
        try:
            result = {'format': 'binary'}
            
            # Try to parse as FFM first (common format)
            if len(payload) >= 24:
                freq, level, bw, timestamp = struct.unpack('>dffQ', payload[:24])
                result.update({
                    'frequency': freq,
                    'level_dbm': level,
                    'bandwidth': bw,
                    'timestamp': timestamp,
                })
                
            return result
            
        except Exception as e:
            logger.error(f"Error parsing binary result: {e}")
            return {'error': str(e), 'raw_hex': payload.hex()}
            
    async def send_command(self, command: str, target_addr: tuple):
        """
        Send command to Argus via UDP
        
        Args:
            command: Command string or XML
            target_addr: Target address (host, port)
        """
        try:
            if not self.socket:
                raise RuntimeError("Socket not initialized")
                
            # Create ACD message
            msg_type = 0x10  # Command type
            payload = command.encode('utf-8')
            msg_length = len(payload)
            seq_num = int(datetime.now().timestamp() * 1000) % 0xFFFFFFFF
            
            # Pack header
            header = struct.pack('>IHHi', 0x41434400, msg_type, msg_length, seq_num)
            
            # Send
            message = header + payload
            self.socket.sendto(message, target_addr)
            
            logger.info(f"Sent command to {target_addr}: {command[:100]}...")
            
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            
    async def stop(self):
        """Stop UDP listener"""
        self.running = False
        if self.socket:
            self.socket.close()
        logger.info("ACD UDP listener stopped")


class ACDManager:
    """Manager for ACD connections and measurements"""
    
    def __init__(self, db, port: int = 9876):
        """
        Initialize ACD Manager
        
        Args:
            db: Database connection
            port: UDP port for ACD
        """
        self.db = db
        self.port = port
        self.protocol: Optional[ACDProtocol] = None
        self.measurement_handlers: Dict[str, Callable] = {}
        
    async def start(self):
        """Start ACD manager"""
        self.protocol = ACDProtocol(port=self.port)
        self.protocol.set_callback(self._handle_measurement)
        await self.protocol.start()
        
    async def _handle_measurement(self, result: Dict[str, Any]):
        """
        Handle received measurement result
        
        Args:
            result: Parsed measurement result
        """
        try:
            logger.info(f"Received measurement: {result.get('order_id', 'unknown')}")
            
            # Save to database
            await self.db.acd_measurements.insert_one(result)
            
            # Call registered handlers
            order_id = result.get('order_id')
            if order_id in self.measurement_handlers:
                await self.measurement_handlers[order_id](result)
                
        except Exception as e:
            logger.error(f"Error handling measurement: {e}")
            
    def register_handler(self, order_id: str, handler: Callable):
        """Register handler for specific order"""
        self.measurement_handlers[order_id] = handler
        
    def unregister_handler(self, order_id: str):
        """Unregister handler"""
        self.measurement_handlers.pop(order_id, None)
        
    async def stop(self):
        """Stop ACD manager"""
        if self.protocol:
            await self.protocol.stop()
