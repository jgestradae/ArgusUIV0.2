"""
ADC Order Generator for R&S Argus
Generates ADC-compatible XML orders according to ORM manual chapter 8
Orders are written to Argus INBOX directory (file-based, not TCP)
"""
import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path
import logging
import uuid

logger = logging.getLogger(__name__)

class ADCOrderGenerator:
    """Generates ADC-compatible XML orders for Argus"""
    
    def __init__(self, inbox_path: str, data_path: str):
        self.inbox_path = Path(inbox_path)
        self.data_path = Path(data_path)
        
        # Create directories if they don't exist
        self.inbox_path.mkdir(parents=True, exist_ok=True)
        self.data_path.mkdir(parents=True, exist_ok=True)
        (self.data_path / "adc_orders").mkdir(exist_ok=True)
        
        logger.info(f"ADC Order Generator initialized: INBOX={inbox_path}")
    
    def generate_order_id(self, prefix: str = "ADC") -> str:
        """
        Generate unique order ID
        Format: PREFIX_YYMMDD_HHMMSSXXX
        Example: ADC_250115_143022456
        """
        now = datetime.now()
        date_part = now.strftime("%y%m%d")
        time_part = now.strftime("%H%M%S")
        counter = now.strftime("%f")[:3]
        return f"{prefix}_{date_part}_{time_part}{counter}"
    
    def create_scan_order(
        self,
        order_id: str,
        station_id: str,
        freq_start: float,
        freq_stop: float,
        freq_step: float = 25000,
        bandwidth: float = 10000,
        detector: str = "RMS",
        priority: int = 1,
        meas_time: float = -1,
        attenuation: str = "Auto"
    ) -> str:
        """
        Create ADC SCAN order XML
        
        Args:
            order_id: Unique order identifier
            station_id: Target station name
            freq_start: Start frequency in Hz
            freq_stop: Stop frequency in Hz
            freq_step: Frequency step size in Hz
            bandwidth: Resolution bandwidth in Hz
            detector: Detector type (RMS, Peak, AVG)
            priority: Order priority (1=LOW, 2=NORMAL, 3=HIGH)
            meas_time: Measurement time (-1 for auto)
            attenuation: RF attenuation ("Auto" or dB value)
            
        Returns:
            XML string
        """
        # Create root with ADC namespace
        root = ET.Element("ORDER")
        root.set("xmlns", "http://www.rohde-schwarz.com/ARGUS/ORM_ADC")
        
        # HEADER
        header = ET.SubElement(root, "HEADER")
        ET.SubElement(header, "CMD").text = "SCAN"
        ET.SubElement(header, "ID").text = order_id
        ET.SubElement(header, "STATION").text = station_id
        ET.SubElement(header, "ORDER_TYPE").text = "ADC"
        ET.SubElement(header, "PRIORITY").text = str(priority)
        ET.SubElement(header, "TIMESTAMP").text = datetime.now(timezone.utc).isoformat()
        
        # BODY with measurement parameters
        body = ET.SubElement(root, "BODY")
        
        # Frequency parameters
        ET.SubElement(body, "FREQ_START", unit="Hz").text = str(int(freq_start))
        ET.SubElement(body, "FREQ_STOP", unit="Hz").text = str(int(freq_stop))
        ET.SubElement(body, "FREQ_STEP", unit="Hz").text = str(int(freq_step))
        
        # Measurement parameters
        ET.SubElement(body, "BANDWIDTH", unit="Hz").text = str(int(bandwidth))
        ET.SubElement(body, "DETECTOR").text = detector
        ET.SubElement(body, "MEAS_TIME", unit="ms").text = str(meas_time)
        ET.SubElement(body, "ATTENUATION").text = str(attenuation)
        
        return self._format_xml(root)
    
    def create_single_freq_order(
        self,
        order_id: str,
        station_id: str,
        frequency: float,
        bandwidth: float = 10000,
        detector: str = "RMS",
        priority: int = 1,
        meas_time: float = 1000,
        attenuation: str = "Auto",
        measurement_type: str = "LEVEL"
    ) -> str:
        """
        Create ADC single frequency measurement order XML
        
        Args:
            order_id: Unique order identifier
            station_id: Target station name
            frequency: Measurement frequency in Hz
            bandwidth: Resolution bandwidth in Hz
            detector: Detector type (RMS, Peak, AVG)
            priority: Order priority (1=LOW, 2=NORMAL, 3=HIGH)
            meas_time: Measurement time in ms
            attenuation: RF attenuation ("Auto" or dB value)
            measurement_type: Type (LEVEL, DF, DEMOD, SPECTRUM)
            
        Returns:
            XML string
        """
        # Create root with ADC namespace
        root = ET.Element("ORDER")
        root.set("xmlns", "http://www.rohde-schwarz.com/ARGUS/ORM_ADC")
        
        # HEADER
        header = ET.SubElement(root, "HEADER")
        ET.SubElement(header, "CMD").text = "MEASURE"
        ET.SubElement(header, "ID").text = order_id
        ET.SubElement(header, "STATION").text = station_id
        ET.SubElement(header, "ORDER_TYPE").text = "ADC"
        ET.SubElement(header, "PRIORITY").text = str(priority)
        ET.SubElement(header, "TIMESTAMP").text = datetime.now(timezone.utc).isoformat()
        
        # BODY
        body = ET.SubElement(root, "BODY")
        
        # Measurement parameters
        ET.SubElement(body, "FREQUENCY", unit="Hz").text = str(int(frequency))
        ET.SubElement(body, "BANDWIDTH", unit="Hz").text = str(int(bandwidth))
        ET.SubElement(body, "DETECTOR").text = detector
        ET.SubElement(body, "MEAS_TIME", unit="ms").text = str(meas_time)
        ET.SubElement(body, "ATTENUATION").text = str(attenuation)
        ET.SubElement(body, "MEAS_TYPE").text = measurement_type
        
        return self._format_xml(root)
    
    def _format_xml(self, root: ET.Element) -> str:
        """Format XML with proper indentation and declaration"""
        rough_string = ET.tostring(root, encoding='unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
    
    def save_order_to_inbox(self, xml_content: str, order_id: str) -> Dict[str, Any]:
        """
        Save ADC order XML to Argus INBOX directory
        
        Args:
            xml_content: XML content to save
            order_id: Order identifier
            
        Returns:
            Dictionary with file path and status
        """
        try:
            # Create filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ADC_{order_id}_{timestamp}.xml"
            
            # Save to INBOX (Argus will auto-detect and execute)
            inbox_file = self.inbox_path / filename
            with open(inbox_file, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
            # Also save copy to data archive
            archive_file = self.data_path / "adc_orders" / filename
            with open(archive_file, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
            logger.info(f"ADC order saved to INBOX: {filename}")
            
            return {
                'success': True,
                'inbox_path': str(inbox_file),
                'archive_path': str(archive_file),
                'filename': filename,
                'order_id': order_id
            }
            
        except Exception as e:
            logger.error(f"Failed to save ADC order: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'order_id': order_id
            }
