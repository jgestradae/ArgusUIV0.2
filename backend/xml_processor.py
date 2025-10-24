import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import Dict, Any, Optional, List
from datetime import datetime
import os
import uuid
from pathlib import Path
from models import OrderType, SubOrderTask, ResultType, FrequencyMode
import logging

logger = logging.getLogger(__name__)

class ArgusXMLProcessor:
    def __init__(self, inbox_path: str, outbox_path: str, data_path: str):
        self.inbox_path = Path(inbox_path)
        self.outbox_path = Path(outbox_path)
        self.data_path = Path(data_path)
        
        # Create directories if they don't exist
        self.inbox_path.mkdir(parents=True, exist_ok=True)
        self.outbox_path.mkdir(parents=True, exist_ok=True)
        self.data_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories for organized storage
        (self.data_path / "xml_requests").mkdir(exist_ok=True)
        (self.data_path / "xml_responses").mkdir(exist_ok=True)
        (self.data_path / "measurement_results").mkdir(exist_ok=True)

    def generate_order_id(self, prefix: str = "ARGUSUI") -> str:
        """Generate unique order ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"{prefix}_{timestamp}_{unique_id}"

    def create_system_state_request(self, order_id: str, sender: str = "HQ4", sender_pc: str = "SRVARGUS") -> str:
        """Create GSS (Get System State) XML request"""
        # Create root with proper namespace
        root = ET.Element("XMLSchema1")
        root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
        
        # Order definition
        order_def = ET.SubElement(root, "ORDER_DEF")
        ET.SubElement(order_def, "ORDER_ID").text = order_id
        ET.SubElement(order_def, "ORDER_TYPE").text = "GSS"
        ET.SubElement(order_def, "ORDER_NAME").text = "SystemStateQuery"
        ET.SubElement(order_def, "ORDER_SENDER").text = sender
        ET.SubElement(order_def, "ORDER_SENDER_PC").text = sender_pc
        ET.SubElement(order_def, "ORDER_STATE").text = "Open"
        ET.SubElement(order_def, "ORDER_CREATOR").text = "Extern"
        ET.SubElement(order_def, "EXECUTION_TYPE").text = "A"
        ET.SubElement(order_def, "ORDER_VER").text = "200"
        
        return self._format_xml(root)

    def create_system_params_request(self, order_id: str, sender: str = "ArgusUI") -> str:
        """Create GSP (Get System Parameters) XML request"""
        root = ET.Element("order_def")
        
        # Order definition
        ET.SubElement(root, "order_id").text = order_id
        ET.SubElement(root, "order_type").text = "GSP"
        ET.SubElement(root, "order_name").text = "System Parameters Query"
        ET.SubElement(root, "order_sender").text = sender
        ET.SubElement(root, "order_state").text = "Open"
        ET.SubElement(root, "order_creator").text = "External"
        ET.SubElement(root, "execution_type").text = "A"
        ET.SubElement(root, "order_ver").text = "200"
        
        return self._format_xml(root)

    def create_measurement_order(self, order_id: str, config: Dict[str, Any], 
                               sender: str = "ArgusUI") -> str:
        """Create measurement order XML (OR type with suborder)"""
        root = ET.Element("order_def")
        
        # Order definition
        ET.SubElement(root, "order_id").text = order_id
        ET.SubElement(root, "order_type").text = "OR"
        ET.SubElement(root, "order_name").text = config.get("name", "Measurement Order")
        ET.SubElement(root, "order_sender").text = sender
        ET.SubElement(root, "order_state").text = "Open"
        ET.SubElement(root, "order_creator").text = "External"
        ET.SubElement(root, "execution_type").text = "A"
        ET.SubElement(root, "order_ver").text = "200"
        
        # Sub-order definition
        sub_order = ET.SubElement(root, "sub_order_def")
        ET.SubElement(sub_order, "suborder_name").text = config.get("suborder_name", "Measurement")
        ET.SubElement(sub_order, "suborder_state").text = "Open"
        ET.SubElement(sub_order, "suborder_task").text = config.get("task", "FFM")
        ET.SubElement(sub_order, "result_type").text = config.get("result_type", "MR")
        ET.SubElement(sub_order, "result_format").text = "XML"
        
        # ACT definition
        act_def = ET.SubElement(sub_order, "act_def")
        ET.SubElement(act_def, "acd_userstring").text = f"{order_id}_SUB"
        
        # Frequency parameters
        freq_param = ET.SubElement(sub_order, "freq_param")
        freq_mode = config.get("freq_mode", "S")
        ET.SubElement(freq_param, "freq_par_mode").text = freq_mode
        
        if freq_mode == "S" and "freq_single" in config:
            ET.SubElement(freq_param, "freq_par_s").text = str(config["freq_single"])
        elif freq_mode == "R":
            if "freq_range_low" in config:
                ET.SubElement(freq_param, "freq_par_rg_l").text = str(config["freq_range_low"])
            if "freq_range_high" in config:
                ET.SubElement(freq_param, "freq_par_rg_u").text = str(config["freq_range_high"])
            if "freq_step" in config:
                ET.SubElement(freq_param, "freq_par_step").text = str(config["freq_step"])
        
        # Frequency list for L mode
        if freq_mode == "L" and "freq_list" in config:
            for freq in config["freq_list"]:
                freq_lst = ET.SubElement(sub_order, "freq_lst")
                ET.SubElement(freq_lst, "freq").text = str(freq)
        
        # Optional parameters
        if "if_bandwidth" in config:
            ET.SubElement(sub_order, "if_bandwidth").text = str(config["if_bandwidth"])
        if "rf_attenuation" in config:
            ET.SubElement(sub_order, "rf_attenuation").text = str(config["rf_attenuation"])
        if "demodulation" in config:
            ET.SubElement(sub_order, "demod").text = config["demodulation"]
        
        # Measurement parameters
        if config.get("task") in ["FFM", "SCAN"]:
            mdt_param = ET.SubElement(sub_order, "mdt_param")
            ET.SubElement(mdt_param, "meas_data_type").text = config.get("meas_data_type", "LV")
            if "measurement_time" in config:
                ET.SubElement(mdt_param, "meas_time").text = str(config["measurement_time"])
            ET.SubElement(mdt_param, "detect_type").text = config.get("detect_type", "Average")
        
        return self._format_xml(root)

    def _format_xml(self, root: ET.Element) -> str:
        """Format XML with proper indentation"""
        rough_string = ET.tostring(root, encoding='unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")

    def save_request(self, xml_content: str, order_id: str) -> str:
        """Save XML request to both data storage and Argus inbox"""
        # Save to data storage for archival
        data_file = self.data_path / "xml_requests" / f"{order_id}.xml"
        with open(data_file, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        # Save to Argus inbox for processing
        inbox_file = self.inbox_path / f"{order_id}.xml"
        with open(inbox_file, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        logger.info(f"XML request saved: {order_id}")
        return str(data_file)

    def check_responses(self) -> List[Dict[str, Any]]:
        """Check for new responses in Argus outbox"""
        responses = []
        
        if not self.outbox_path.exists():
            return responses
        
        for xml_file in self.outbox_path.glob("*.xml"):
            try:
                order_id = xml_file.stem
                
                # Move to data storage
                response_file = self.data_path / "xml_responses" / xml_file.name
                xml_file.rename(response_file)
                
                # Parse response
                response_data = self.parse_response(str(response_file))
                response_data["order_id"] = order_id
                response_data["xml_file"] = str(response_file)
                
                responses.append(response_data)
                logger.info(f"Processed response: {order_id}")
                
            except Exception as e:
                logger.error(f"Error processing response {xml_file}: {e}")
        
        return responses

    def parse_response(self, xml_file_path: str) -> Dict[str, Any]:
        """Parse XML response from Argus"""
        try:
            tree = ET.parse(xml_file_path)
            root = tree.getroot()
            
            result = {
                "timestamp": datetime.now(),
                "raw_xml_file": xml_file_path
            }
            
            # Extract order information
            order_id_elem = root.find(".//order_id")
            if order_id_elem is not None:
                result["order_id"] = order_id_elem.text
            
            order_type_elem = root.find(".//order_type")
            if order_type_elem is not None:
                result["order_type"] = order_type_elem.text
            
            order_state_elem = root.find(".//order_state")
            if order_state_elem is not None:
                result["order_state"] = order_state_elem.text
            
            # Parse system state responses (GSS)
            if result.get("order_type") == "GSS":
                result.update(self._parse_system_state(root))
            
            # Parse measurement results
            measurement_data = root.findall(".//meas_data")
            if measurement_data:
                result["measurement_results"] = self._parse_measurement_data(measurement_data)
            
            # Parse error information
            error_elem = root.find(".//acd_err")
            if error_elem is not None and error_elem.text not in ["S", "Success"]:
                result["error"] = {
                    "code": error_elem.text,
                    "message": root.find(".//acd_err_mess").text if root.find(".//acd_err_mess") is not None else "Unknown error"
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing XML response: {e}")
            return {"error": str(e), "raw_xml_file": xml_file_path}

    def _parse_system_state(self, root: ET.Element) -> Dict[str, Any]:
        """Parse system state information from GSS response"""
        state = {}
        
        # System running status
        run_elem = root.find(".//mss_run")
        if run_elem is not None:
            state["is_running"] = run_elem.text.upper() == "Y"
        
        # Current user
        user_elem = root.find(".//mss_user")
        if user_elem is not None:
            state["current_user"] = user_elem.text
        
        # Timing information
        monitor_time_elem = root.find(".//mss_monitor_time")
        if monitor_time_elem is not None:
            state["monitoring_time"] = int(monitor_time_elem.text)
        
        # Stations
        stations = []
        for station in root.findall(".//mss_st_name"):
            if station.text:
                stations.append({
                    "name": station.text,
                    "type": "fixed"  # Default, could be parsed from mss_st_type
                })
        state["stations"] = stations
        
        # Devices
        devices = []
        for device in root.findall(".//mss_dev"):
            device_name = device.find("d_name")
            device_state = device.find("d_state")
            if device_name is not None:
                devices.append({
                    "name": device_name.text,
                    "state": device_state.text if device_state is not None else "unknown"
                })
        state["devices"] = devices
        
        return state

    def _parse_measurement_data(self, measurement_data: List[ET.Element]) -> List[Dict[str, Any]]:
        """Parse measurement result data"""
        results = []
        
        for meas in measurement_data:
            result = {}
            
            # Basic measurement info
            freq_elem = meas.find("md_m_freq")
            if freq_elem is not None:
                result["frequency"] = float(freq_elem.text)
            
            level_elem = meas.find("md_lev") or meas.find("md_d_lev")
            if level_elem is not None:
                result["level"] = float(level_elem.text)
            
            # Time
            time_elem = meas.find("md_time")
            if time_elem is not None:
                result["timestamp"] = time_elem.text
            
            # Direction finding results
            bearing_elem = meas.find("md_dir")
            if bearing_elem is not None:
                result["bearing"] = float(bearing_elem.text)
            
            results.append(result)
        
        return results

    def create_mock_response(self, order_type: str, order_id: str) -> Dict[str, Any]:
        """Create mock response for testing purposes"""
        base_response = {
            "order_id": order_id,
            "order_type": order_type,
            "order_state": "Finished",
            "timestamp": datetime.now()
        }
        
        if order_type == "GSS":
            base_response.update({
                "is_running": True,
                "current_user": "argus_operator",
                "monitoring_time": 120,
                "stations": [
                    {"name": "Station_001", "type": "fixed"},
                    {"name": "Mobile_Unit_01", "type": "mobile"}
                ],
                "devices": [
                    {"name": "ESMD_Receiver_01", "state": "operational"},
                    {"name": "DF_Antenna_System", "state": "operational"}
                ]
            })
        elif order_type == "OR":
            base_response.update({
                "measurement_results": [
                    {
                        "frequency": 100000000,  # 100 MHz
                        "level": -65.5,
                        "timestamp": datetime.now().isoformat(),
                        "bearing": 45.2
                    }
                ]
            })
        
        return base_response
