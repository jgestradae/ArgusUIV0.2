"""
ORM-ADC Client for R&S Argus Direct Measurement
Handles TCP commands (port 4090) and UDP streaming data (port 40090)
"""
import socket
import asyncio
import struct
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class ORMADCClient:
    """Client for ORM-ADC communication with R&S Argus"""
    
    def __init__(self, host: str, tcp_port: int = 4090, udp_port: int = 40090):
        self.host = host
        self.tcp_port = tcp_port
        self.udp_port = udp_port
        self.udp_listener = None
        self.tcp_socket = None
        self.is_listening = False
        self.data_callback = None
        
    def connect_tcp(self, timeout: int = 5) -> bool:
        """
        Establish TCP connection to Argus
        Returns True if successful
        """
        try:
            self.tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.tcp_socket.settimeout(timeout)
            self.tcp_socket.connect((self.host, self.tcp_port))
            logger.info(f"TCP connected to {self.host}:{self.tcp_port}")
            return True
        except Exception as e:
            logger.error(f"TCP connection failed: {str(e)}")
            return False
    
    def disconnect_tcp(self):
        """Close TCP connection"""
        if self.tcp_socket:
            try:
                self.tcp_socket.close()
            except:
                pass
            self.tcp_socket = None
            logger.info("TCP disconnected")
    
    def send_order(self, xml_order: str, timeout: int = 10) -> Optional[str]:
        """
        Send XML order via TCP and receive response
        
        Args:
            xml_order: XML string of the order
            timeout: Response timeout in seconds
            
        Returns:
            Response XML string or None if failed
        """
        try:
            if not self.tcp_socket:
                if not self.connect_tcp():
                    return None
            
            # Send XML order
            self.tcp_socket.sendall(xml_order.encode('utf-8'))
            logger.info(f"Sent order to {self.host}:{self.tcp_port}")
            
            # Receive response
            self.tcp_socket.settimeout(timeout)
            response_data = b''
            
            while True:
                chunk = self.tcp_socket.recv(8192)
                if not chunk:
                    break
                response_data += chunk
                
                # Check if we have complete XML
                try:
                    decoded = response_data.decode('utf-8')
                    if '</RESPONSE>' in decoded or '</ORDER>' in decoded:
                        break
                except:
                    continue
            
            response = response_data.decode('utf-8')
            logger.info(f"Received response: {len(response)} bytes")
            return response
            
        except socket.timeout:
            logger.error("TCP receive timeout")
            return None
        except Exception as e:
            logger.error(f"Send order failed: {str(e)}")
            return None
    
    async def start_udp_listener(self, callback: Callable[[bytes, tuple], None]):
        """
        Start UDP listener for streaming data from Argus
        
        Args:
            callback: Function to call with (data: bytes, addr: tuple)
        """
        self.data_callback = callback
        self.is_listening = True
        
        try:
            # Create UDP socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('0.0.0.0', self.udp_port))
            sock.setblocking(False)
            
            logger.info(f"UDP listener started on port {self.udp_port}")
            
            loop = asyncio.get_event_loop()
            
            while self.is_listening:
                try:
                    # Receive UDP packet
                    data, addr = await loop.sock_recvfrom(sock, 65536)
                    
                    if data and self.data_callback:
                        # Call callback with received data
                        await self.data_callback(data, addr)
                        
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"UDP receive error: {str(e)}")
                    await asyncio.sleep(0.1)
            
            sock.close()
            logger.info("UDP listener stopped")
            
        except Exception as e:
            logger.error(f"UDP listener failed to start: {str(e)}")
            self.is_listening = False
    
    def stop_udp_listener(self):
        """Stop UDP listener"""
        self.is_listening = False
    
    @staticmethod
    def build_scan_order(
        order_id: str,
        station_id: str,
        start_freq: float,
        stop_freq: float,
        step_size: float = 25000,
        bandwidth: float = 10000,
        detector: str = "RMS",
        attenuation: float = 0,
        priority: int = 1
    ) -> str:
        """
        Build SCAN order XML
        
        Args:
            order_id: Unique order identifier
            station_id: Target station ID
            start_freq: Start frequency in Hz
            stop_freq: Stop frequency in Hz
            step_size: Step size in Hz
            bandwidth: Resolution bandwidth in Hz
            detector: Detector type (RMS, PEAK, AVG)
            attenuation: RF attenuation in dB
            priority: Order priority (1-10)
            
        Returns:
            XML string
        """
        xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<ORDER xmlns="http://www.rohde-schwarz.com/ARGUS/ORM_ADC">
  <HEADER>
    <CMD>SCAN</CMD>
    <ID>{order_id}</ID>
    <STATION>{station_id}</STATION>
    <PRIORITY>{priority}</PRIORITY>
    <TIMESTAMP>{datetime.now(timezone.utc).isoformat()}</TIMESTAMP>
  </HEADER>
  <BODY>
    <SCAN_PARAMS>
      <FREQ_START unit="Hz">{int(start_freq)}</FREQ_START>
      <FREQ_STOP unit="Hz">{int(stop_freq)}</FREQ_STOP>
      <FREQ_STEP unit="Hz">{int(step_size)}</FREQ_STEP>
      <BANDWIDTH unit="Hz">{int(bandwidth)}</BANDWIDTH>
      <DETECTOR>{detector}</DETECTOR>
      <ATTENUATION unit="dB">{attenuation}</ATTENUATION>
    </SCAN_PARAMS>
  </BODY>
</ORDER>'''
        return xml
    
    @staticmethod
    def build_measure_order(
        order_id: str,
        station_id: str,
        frequency: float,
        bandwidth: float = 10000,
        measurement_type: str = "LEVEL",
        duration: float = 1.0,
        attenuation: float = 0,
        priority: int = 1
    ) -> str:
        """
        Build MEASURE order XML for single frequency measurement
        
        Args:
            order_id: Unique order identifier
            station_id: Target station ID
            frequency: Measurement frequency in Hz
            bandwidth: Resolution bandwidth in Hz
            measurement_type: Type (LEVEL, DF, DEMOD, etc.)
            duration: Measurement duration in seconds
            attenuation: RF attenuation in dB
            priority: Order priority
            
        Returns:
            XML string
        """
        xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<ORDER xmlns="http://www.rohde-schwarz.com/ARGUS/ORM_ADC">
  <HEADER>
    <CMD>MEASURE</CMD>
    <ID>{order_id}</ID>
    <STATION>{station_id}</STATION>
    <PRIORITY>{priority}</PRIORITY>
    <TIMESTAMP>{datetime.now(timezone.utc).isoformat()}</TIMESTAMP>
  </HEADER>
  <BODY>
    <MEASURE_PARAMS>
      <FREQUENCY unit="Hz">{int(frequency)}</FREQUENCY>
      <BANDWIDTH unit="Hz">{int(bandwidth)}</BANDWIDTH>
      <TYPE>{measurement_type}</TYPE>
      <DURATION unit="s">{duration}</DURATION>
      <ATTENUATION unit="dB">{attenuation}</ATTENUATION>
    </MEASURE_PARAMS>
  </BODY>
</ORDER>'''
        return xml
    
    @staticmethod
    def parse_response(xml_response: str) -> Dict[str, Any]:
        """
        Parse XML response from Argus
        
        Returns:
            Dictionary with parsed data
        """
        try:
            root = ET.fromstring(xml_response)
            
            result = {
                'success': False,
                'order_id': None,
                'status': None,
                'message': None,
                'data': {}
            }
            
            # Parse HEADER
            header = root.find('.//{http://www.rohde-schwarz.com/ARGUS/ORM_ADC}HEADER')
            if header is None:
                header = root.find('.//HEADER')
            
            if header is not None:
                status_elem = header.find('.//STATUS')
                id_elem = header.find('.//ID')
                msg_elem = header.find('.//MESSAGE')
                
                if status_elem is not None:
                    result['status'] = status_elem.text
                    result['success'] = status_elem.text == 'OK'
                
                if id_elem is not None:
                    result['order_id'] = id_elem.text
                
                if msg_elem is not None:
                    result['message'] = msg_elem.text
            
            # Parse BODY if present
            body = root.find('.//{http://www.rohde-schwarz.com/ARGUS/ORM_ADC}BODY')
            if body is None:
                body = root.find('.//BODY')
            
            if body is not None:
                # Extract all parameters
                for param in body.findall('.//PARAMETER'):
                    name = param.get('name')
                    value = param.text
                    unit = param.get('unit')
                    
                    if name:
                        result['data'][name] = {
                            'value': value,
                            'unit': unit
                        }
            
            return result
            
        except Exception as e:
            logger.error(f"Response parse error: {str(e)}")
            return {
                'success': False,
                'order_id': None,
                'status': 'PARSE_ERROR',
                'message': str(e),
                'data': {}
            }


class UDPDataParser:
    """Parser for UDP streaming data from Argus"""
    
    @staticmethod
    def parse_spectrum_data(data: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse spectrum data from UDP packet
        
        Expected format (simplified):
        - 4 bytes: packet type
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
            values_offset = 28
            values = []
            
            for i in range(num_points):
                offset = values_offset + (i * 4)
                if offset + 4 <= len(data):
                    value = struct.unpack('>f', data[offset:offset+4])[0]
                    values.append(value)
            
            return {
                'packet_type': packet_type,
                'frequency_start': freq_start,
                'frequency_step': freq_step,
                'num_points': num_points,
                'levels': values,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Spectrum data parse error: {str(e)}")
            return None
    
    @staticmethod
    def parse_if_data(data: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse IF (Intermediate Frequency) data from UDP
        
        Returns:
            Dictionary with IF samples or None
        """
        try:
            # IF data is typically I/Q samples
            # Format: alternating I and Q values (16-bit signed integers)
            
            num_samples = len(data) // 4  # 2 bytes I + 2 bytes Q per sample
            
            i_samples = []
            q_samples = []
            
            for idx in range(num_samples):
                offset = idx * 4
                if offset + 4 <= len(data):
                    i_val = struct.unpack('>h', data[offset:offset+2])[0]
                    q_val = struct.unpack('>h', data[offset+2:offset+4])[0]
                    i_samples.append(i_val)
                    q_samples.append(q_val)
            
            return {
                'type': 'IF_DATA',
                'num_samples': len(i_samples),
                'i_samples': i_samples[:1000],  # Limit to 1000 samples for transmission
                'q_samples': q_samples[:1000],
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"IF data parse error: {str(e)}")
            return None
