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

    def generate_order_id(self, prefix: str = "GSS") -> str:
        """Generate unique order ID in Argus format: PREFIX + DDMMYY + HHMMSS + XXX"""
        now = datetime.now()
        date_part = now.strftime("%d%m%y")  # DDMMYY format
        time_part = now.strftime("%H%M%S")  # HHMMSS format
        counter = now.strftime("%f")[:3]    # Milliseconds as 3-digit counter
        return f"{prefix}{date_part}{time_part}{counter}"

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

    def create_system_params_request(self, order_id: str, sender: str = "HQ4", sender_pc: str = "SRVARGUS") -> str:
        """Create GSP (Get System Parameters) XML request"""
        # Create root with proper namespace
        root = ET.Element("XMLSchema1")
        root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
        
        # Order definition
        order_def = ET.SubElement(root, "ORDER_DEF")
        ET.SubElement(order_def, "ORDER_ID").text = order_id
        ET.SubElement(order_def, "ORDER_TYPE").text = "GSP"
        ET.SubElement(order_def, "ORDER_NAME").text = "SystemParametersQuery"
        ET.SubElement(order_def, "ORDER_SENDER").text = sender
        ET.SubElement(order_def, "ORDER_SENDER_PC").text = sender_pc
        ET.SubElement(order_def, "ORDER_STATE").text = "Open"
        ET.SubElement(order_def, "ORDER_CREATOR").text = "Extern"
        ET.SubElement(order_def, "EXECUTION_TYPE").text = "A"
        ET.SubElement(order_def, "ORDER_VER").text = "200"
        
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
        """
        Save XML request to both data storage and Argus inbox
        
        Filename format: PREFIX-DDMMYY-HHMMSSXXX-O.xml
        Example: GSS-251025-182839822-O.xml
        Where ORDER_ID inside XML is: GSS251025182839822 (no dashes, no suffix)
        """
        # Parse order_id to create proper filename
        # order_id format: GSS251025182839822 (PREFIX + DDMMYY + HHMMSSXXX)
        prefix = order_id[:3]  # GSS
        date_part = order_id[3:9]  # 251025 (DDMMYY)
        time_part = order_id[9:]  # 182839822 (HHMMSSXXX)
        
        # Create filename with dashes and -O suffix for outgoing
        filename = f"{prefix}-{date_part}-{time_part}-O.xml"
        
        # Save to data storage for archival
        data_file = self.data_path / "xml_requests" / filename
        data_file.parent.mkdir(parents=True, exist_ok=True)
        with open(data_file, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        # Save to Argus inbox for processing
        inbox_file = self.inbox_path / filename
        with open(inbox_file, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        
        logger.info(f"Saved request to inbox: {filename}")
        return str(inbox_file)

    def check_responses(self) -> List[Dict[str, Any]]:
        """
        Check for new responses in Argus outbox
        
        Response filename format: PREFIX-DDMMYY-HHMMSSXXX-R.xml
        Example: GSS-251025-182839822-R.xml (note -R suffix for response)
        """
        responses = []
        
        if not self.outbox_path.exists():
            return responses
        
        # Look for XML files with -R suffix (responses)
        for xml_file in self.outbox_path.glob("*-R.xml"):
            try:
                # Parse filename to extract order_id
                # Format: PREFIX-DDMMYY-HHMMSSXXX-R.xml
                filename = xml_file.stem  # Remove .xml
                parts = filename.split('-')
                
                if len(parts) >= 4:
                    # Reconstruct order_id without dashes and suffix
                    prefix = parts[0]
                    date_part = parts[1]
                    time_part = parts[2]
                    order_id = f"{prefix}{date_part}{time_part}"
                else:
                    # Fallback for old format
                    order_id = filename.replace('-R', '')
                
                logger.info(f"Processing response file: {xml_file.name}, order_id: {order_id}")
                
                # Move to data storage
                response_file = self.data_path / "xml_responses" / xml_file.name
                response_file.parent.mkdir(parents=True, exist_ok=True)
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
            
            # Extract order information (UPPERCASE elements)
            order_def = root.find(".//ORDER_DEF")
            if order_def is not None:
                order_id_elem = order_def.find("ORDER_ID")
                if order_id_elem is not None:
                    result["order_id"] = order_id_elem.text
                
                order_type_elem = order_def.find("ORDER_TYPE")
                if order_type_elem is not None:
                    result["order_type"] = order_type_elem.text
                
                order_state_elem = order_def.find("ORDER_STATE")
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
            error_elem = root.find(".//ACD_ERR")
            if error_elem is not None and error_elem.text not in ["", "S", "Success", None]:
                result["error"] = {
                    "code": error_elem.text,
                    "message": "Error in order execution"
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing XML response: {e}")
            return {"error": str(e), "raw_xml_file": xml_file_path}

    def _parse_system_state(self, root: ET.Element) -> Dict[str, Any]:
        """Parse system state information from GSS response"""
        state = {
            "stations": [],
            "devices": [],
            "is_running": False,
            "total_stations": 0,
            "online_stations": 0,
            "offline_stations": 0
        }
        
        # Parse all MONSYS_STRUCTURE elements (one per station)
        for monsys in root.findall(".//MONSYS_STRUCTURE"):
            station_data = {}
            
            # Basic station info
            station_name = monsys.find("MSS_ST_NAME")
            station_type = monsys.find("MSS_ST_TYPE")
            station_pc = monsys.find("MSS_RMC_PC")
            run_status = monsys.find("MSS_RUN")
            user = monsys.find("MSS_USER")
            longitude = monsys.find("MSS_LONG")
            latitude = monsys.find("MSS_LAT")
            req_time = monsys.find("MSS_REQ_TIME")
            
            if station_name is not None:
                station_data["name"] = station_name.text
                station_data["type"] = station_type.text if station_type is not None else "F"
                station_data["pc"] = station_pc.text if station_pc is not None else ""
                station_data["running"] = run_status.text == "Y" if run_status is not None else False
                station_data["user"] = user.text if user is not None and user.text else ""
                station_data["longitude"] = float(longitude.text) if longitude is not None else 0
                station_data["latitude"] = float(latitude.text) if latitude is not None else 0
                station_data["last_request"] = req_time.text if req_time is not None else ""
                
                # Parse devices for this station
                station_devices = []
                for dev in monsys.findall("MSS_DEV"):
                    dev_name = dev.find("D_NAME")
                    dev_driver = dev.find("D_DRIVER")
                    dev_state = dev.find("D_STATE")
                    
                    if dev_name is not None:
                        device_info = {
                            "name": dev_name.text,
                            "driver": dev_driver.text if dev_driver is not None else "",
                            "state": dev_state.text if dev_state is not None else "unknown",
                            "station": station_data["name"]
                        }
                        station_devices.append(device_info)
                        state["devices"].append(device_info)
                
                station_data["device_count"] = len(station_devices)
                station_data["devices"] = station_devices
                
                # Check if station has active measurements
                mss_state = monsys.find("MSS_STATE")
                if mss_state is not None:
                    mode = mss_state.find("MODE")
                    station_data["active_mode"] = mode.text if mode is not None else ""
                else:
                    station_data["active_mode"] = ""
                
                state["stations"].append(station_data)
                state["total_stations"] += 1
                
                if station_data["running"]:
                    state["online_stations"] += 1
                    state["is_running"] = True  # At least one station is running
                else:
                    state["offline_stations"] += 1
        
        return state
        
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
