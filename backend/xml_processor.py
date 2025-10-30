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
        """
        Generate unique order ID in Argus format: PREFIX + YYMMDD + HHMMSSXXX
        Example: OR210914162855677 (OR + 210914 + 162855677)
        """
        now = datetime.now()
        date_part = now.strftime("%y%m%d")  # YYMMDD format (note: YY not DD first!)
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
                               sender: str = "HQ4", sender_pc: str = "SRVARGUS") -> str:
        """
        Create measurement order XML (OR type with suborder) matching ORM format
        Based on ORM manual chapter 4.2 and actual XML examples
        """
        # Create root with proper namespace
        root = ET.Element("XMLSchema1")
        root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
        
        # Order definition - UPPERCASE tags as per Argus standard
        order_def = ET.SubElement(root, "ORDER_DEF")
        ET.SubElement(order_def, "ORDER_ID").text = order_id
        ET.SubElement(order_def, "ORDER_TYPE").text = "OR"
        ET.SubElement(order_def, "ORDER_NAME").text = "ORM"
        ET.SubElement(order_def, "ORDER_SENDER").text = sender
        ET.SubElement(order_def, "ORDER_SENDER_PC").text = sender_pc
        ET.SubElement(order_def, "ORDER_STATE").text = "In Process"
        ET.SubElement(order_def, "ORDER_CREATOR").text = "Intern"  # Always "Intern" for AMM
        ET.SubElement(order_def, "ORDER_ADDRESSEE").text = ""
        ET.SubElement(order_def, "ORDER_VER").text = "300"
        ET.SubElement(order_def, "EXECUTION_TYPE").text = "A"
        ET.SubElement(order_def, "RES_FILE_COMP").text = ""
        ET.SubElement(order_def, "ORDER_CANCEL_TYPE").text = "NO"
        
        # Sub-order definition
        sub_order = ET.SubElement(order_def, "SUB_ORDER_DEF")
        # Use the actual order name from config
        ET.SubElement(sub_order, "SUBORDER_NAME").text = config.get("name", config.get("order_name", "ORM"))
        ET.SubElement(sub_order, "SUBORDER_STATE").text = "In Process"
        ET.SubElement(sub_order, "SUBORDER_TASK").text = config.get("measurement_type", config.get("task", "FFM"))
        ET.SubElement(sub_order, "SUBORDER_PRIO").text = config.get("priority", "LOW")
        ET.SubElement(sub_order, "RESULT_TYPE").text = config.get("result_type", "MR")
        ET.SubElement(sub_order, "RESULT_FORMAT").text = "XML"  # Always XML for compatibility
        ET.SubElement(sub_order, "MEAS_RESULT_SAVE_LOCATION").text = "0"
        ET.SubElement(sub_order, "RESULT_INFO").text = ""
        
        # ACT definition
        act_def = ET.SubElement(sub_order, "ACT_DEF")
        ET.SubElement(act_def, "ACD_USERSTRING").text = order_id
        ET.SubElement(act_def, "ACD_ERR").text = ""
        
        # Frequency parameters
        freq_param = ET.SubElement(sub_order, "FREQ_PARAM")
        freq_mode = config.get("freq_mode", "L")
        ET.SubElement(freq_param, "FREQ_PAR_MODE").text = freq_mode
        
        if freq_mode == "S" and "freq_single" in config:
            ET.SubElement(freq_param, "FREQ_PAR_S").text = str(config["freq_single"])
        elif freq_mode == "R":
            if "freq_range_low" in config:
                ET.SubElement(freq_param, "FREQ_PAR_RG_L").text = str(config["freq_range_low"])
            if "freq_range_high" in config:
                ET.SubElement(freq_param, "FREQ_PAR_RG_U").text = str(config["freq_range_high"])
            if "freq_step" in config:
                ET.SubElement(freq_param, "FREQ_PAR_STEP").text = str(config["freq_step"])
        
        # Frequency list for L mode
        if freq_mode == "L" and "freq_list" in config:
            freq_lst = ET.SubElement(sub_order, "FREQ_LST")
            for freq in config["freq_list"]:
                ET.SubElement(freq_lst, "FREQ").text = str(freq)
        
        # MDT (Measurement Data Type) parameters
        mdt_param = ET.SubElement(sub_order, "MDT_PARAM")
        ET.SubElement(mdt_param, "MEAS_DATA_TYPE").text = config.get("meas_data_type", "LV")
        ET.SubElement(mdt_param, "LIMIT_CHECK_COUNT").text = str(config.get("limit_check_count", 1))
        ET.SubElement(mdt_param, "FREQ_PAR_BWIDTH").text = str(config.get("if_bandwidth", 100000))
        ET.SubElement(mdt_param, "RF_ATTENUATION").text = config.get("rf_attenuation", "Auto")
        ET.SubElement(mdt_param, "IF_ATTENUATION").text = config.get("if_attenuation", "Normal")
        ET.SubElement(mdt_param, "MEAS_TIME").text = str(config.get("meas_time", -1))
        ET.SubElement(mdt_param, "DETECT_TYPE").text = config.get("detect_type", "Peak")
        ET.SubElement(mdt_param, "DEMOD").text = config.get("demod", "Off")
        ET.SubElement(mdt_param, "PREAMPLIFICATION").text = config.get("preamplification", "Off")
        ET.SubElement(mdt_param, "MODE").text = config.get("mode", "Normal")
        ET.SubElement(mdt_param, "DF_POL").text = ""
        ET.SubElement(mdt_param, "IF_SPAN").text = str(config.get("if_span", 250000))
        ET.SubElement(mdt_param, "SQUELCH").text = config.get("squelch", "Off")
        ET.SubElement(mdt_param, "HOLD_TIME").text = str(config.get("hold_time", 0))
        ET.SubElement(mdt_param, "DF_SPAN").text = "0"
        ET.SubElement(mdt_param, "DF_STEP").text = "0"
        ET.SubElement(mdt_param, "DF_ACT").text = ""
        ET.SubElement(mdt_param, "IF_STEP").text = "0"
        ET.SubElement(mdt_param, "FFT_MODE").text = ""
        
        # TDOA parameters (empty for now)
        for i in range(1, 3):
            ET.SubElement(mdt_param, f"TDOA_AOI_LONG_{i}").text = "0"
            ET.SubElement(mdt_param, f"TDOA_AOI_LAT_{i}").text = "0"
        ET.SubElement(mdt_param, "TDOA_HYPERBOL_CNT").text = "0"
        ET.SubElement(mdt_param, "TDOA_SENSOR_PAIRS").text = "0"
        ET.SubElement(mdt_param, "LIMIT_CHECK").text = "N"
        
        # Antenna settings (no ANT_PORT in actual Argus format)
        ant_set = ET.SubElement(sub_order, "ANT_SET")
        ET.SubElement(ant_set, "ANT_MODE").text = config.get("ant_mode", "FIX")
        
        # Time parameters
        time_param = ET.SubElement(sub_order, "TIME_PARAM")
        ET.SubElement(time_param, "TIME_PAR_MODE").text = config.get("time_mode", "P")
        
        # Format datetime with timezone offset
        start_time = config.get("start_time", datetime.now())
        stop_time = config.get("stop_time", datetime.now())
        
        # Format: 2021-09-14T00:00:00-05:00
        tz_offset = start_time.strftime("%z")
        if not tz_offset:
            tz_offset = "-05:00"  # Default Colombia timezone
        else:
            # Format +/-HHMM to +/-HH:MM
            tz_offset = f"{tz_offset[:3]}:{tz_offset[3:]}"
        
        start_str = start_time.strftime(f"%Y-%m-%dT%H:%M:%S{tz_offset}")
        stop_str = stop_time.strftime(f"%Y-%m-%dT%H:%M:%S{tz_offset}")
        
        ET.SubElement(time_param, "TIME_START").text = start_str
        ET.SubElement(time_param, "TIME_STOP").text = stop_str
        
        # Time parameter list (periodic execution)
        time_param_list = ET.SubElement(sub_order, "TIME_PARAM_LIST")
        # Use actual periodic times from config if available
        per_start = config.get("daily_start_time", "00:00:00")
        per_stop = config.get("daily_end_time", "23:59:59")
        ET.SubElement(time_param_list, "TIME_PER_START").text = f"1899-12-30T{per_start}-05:00"
        ET.SubElement(time_param_list, "TIME_PER_STOP").text = f"1899-12-30T{per_stop}-05:00"
        ET.SubElement(time_param_list, "TIME_DAYS").text = ""
        ET.SubElement(time_param_list, "TIME_ABS_START_STOP").text = "true"
        
        # Measurement station parameters - CRITICAL: Use MSP_SIG_PATH (signal path) not device
        meas_stat_param = ET.SubElement(sub_order, "MEAS_STAT_PARAM")
        ET.SubElement(meas_stat_param, "MSP_RMC").text = sender
        ET.SubElement(meas_stat_param, "MSP_RMC_PC").text = sender_pc
        ET.SubElement(meas_stat_param, "MSP_ST_PC").text = config.get("station_pc", "pasto")
        ET.SubElement(meas_stat_param, "MSP_ST_NAME").text = config.get("station_name", "UMS300-100801")
        ET.SubElement(meas_stat_param, "MSP_ST_TYPE").text = config.get("station_type", "F")
        # MSP_SIG_PATH is the SYSTEM PATH (e.g., "ADD197+075-EB500 DF") - ORM 4.2
        ET.SubElement(meas_stat_param, "MSP_SIG_PATH").text = config.get("signal_path", "ADD197+075-EB500 DF")
        
        # Measurement location parameters
        meas_loc_param = ET.SubElement(sub_order, "MEAS_LOC_PARAM")
        ET.SubElement(meas_loc_param, "MLP_LONG").text = str(config.get("longitude", -77.264667))
        ET.SubElement(meas_loc_param, "MLP_LAT").text = str(config.get("latitude", 1.201194))
        ET.SubElement(meas_loc_param, "MLP_HEIGHT").text = str(config.get("height", 600))
        ET.SubElement(meas_loc_param, "MLP_ALTI").text = "0"
        
        # Measurement preparation parameters
        meas_prep_param = ET.SubElement(sub_order, "MEAS_PREP_PARAM")
        ET.SubElement(meas_prep_param, "MPP_AVE_TIME").text = "0"
        ET.SubElement(meas_prep_param, "MPP_ALARM").text = "0"
        ET.SubElement(meas_prep_param, "MPP_OCC_THRES").text = "0"
        
        # Request measurement parameters
        req_meas_param = ET.SubElement(sub_order, "REQ_MEAS_PARAM")
        ET.SubElement(req_meas_param, "RMP_O_NAME").text = config.get("operator_name", "demo")
        
        # Order state
        or_state = ET.SubElement(sub_order, "OR_STATE")
        ET.SubElement(or_state, "SO_STATE").text = "Q"
        ET.SubElement(or_state, "SO_START_TIME").text = "1600-12-31T19:00:00-05:00"
        ET.SubElement(or_state, "SO_STOP_TIME").text = "1600-12-31T19:00:00-05:00"
        current_time_str = datetime.now().strftime(f"%Y-%m-%dT%H:%M:%S.%f{tz_offset}")
        ET.SubElement(or_state, "SO_CURRENT_TIME").text = current_time_str
        
        return self._format_xml(root)

    def _format_xml(self, root: ET.Element) -> str:
        """Format XML with proper indentation"""
        rough_string = ET.tostring(root, encoding='unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")

    def save_request(self, xml_content: str, order_id: str) -> str:
        """
        Save XML request to both data storage and Argus inbox
        
        Filename format: PREFIX-YYMMDD-HHMMSSXXX-O.xml
        Example: OR-210914-162855677-O.xml
        Where ORDER_ID inside XML is: OR210914162855677 (no dashes, no suffix)
        """
        # Parse order_id to create proper filename
        # order_id format: OR210914162855677 (PREFIX + YYMMDD + HHMMSSXXX)
        prefix = order_id[:2] if order_id.startswith("OR") else order_id[:3]  # OR or GSS
        remaining = order_id[len(prefix):]
        
        # Split remaining into date (6 digits) and time (9 digits)
        date_part = remaining[:6]  # YYMMDD
        time_part = remaining[6:]  # HHMMSSXXX
        
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
            
            # Parse system parameters responses (GSP)
            if result.get("order_type") == "GSP":
                result.update(self._parse_system_parameters(root))
            
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

    def _parse_system_parameters(self, root: ET.Element) -> Dict[str, Any]:
        """Parse GSP (Get System Parameters) response to extract signal paths and device details"""
        params = {
            "signal_paths": [],
            "stations": [],
            "parameter_type": "GSP"
        }
        
        try:
            # Find all MONSYS_STRUCTURE elements (one per station)
            for monsys in root.findall(".//MONSYS_STRUCTURE"):
                station_data = {}
                
                # Extract station information
                station_name_elem = monsys.find("MSS_ST_NAME")
                if station_name_elem is None:
                    continue  # Skip if no station name
                    
                station_data["name"] = station_name_elem.text
                station_data["rmc"] = monsys.find("MSS_RMC").text if monsys.find("MSS_RMC") is not None else ""
                station_data["rmc_pc"] = monsys.find("MSS_RMC_PC").text if monsys.find("MSS_RMC_PC") is not None else ""
                station_data["type"] = monsys.find("MSS_ST_TYPE").text if monsys.find("MSS_ST_TYPE") is not None else "F"
                
                # Extract coordinates
                long_elem = monsys.find("MSS_LONG")
                lat_elem = monsys.find("MSS_LAT")
                station_data["longitude"] = float(long_elem.text) if long_elem is not None and long_elem.text else 0.0
                station_data["latitude"] = float(lat_elem.text) if lat_elem is not None and lat_elem.text else 0.0
                
                # Parse signal paths (MSS_PATHS elements)
                signal_paths = []
                for path in monsys.findall("MSS_PATHS"):
                    path_data = {}
                    
                    # Signal path name - THIS IS THE KEY FIELD for MSP_SIG_PATH
                    path_name_elem = path.find("MP_NAME")
                    if path_name_elem is None:
                        continue
                    
                    path_data["name"] = path_name_elem.text
                    path_data["station"] = station_data["name"]
                    
                    # Frequency range
                    freq_l_elem = path.find("MP_FR_L")
                    freq_u_elem = path.find("MP_FR_U")
                    path_data["freq_min"] = int(freq_l_elem.text) if freq_l_elem is not None and freq_l_elem.text else 0
                    path_data["freq_max"] = int(freq_u_elem.text) if freq_u_elem is not None and freq_u_elem.text else 0
                    
                    # Parse all devices in this path
                    devices = []
                    for mp_dev in path.findall("MP_DEV"):
                        device_data = {}
                        
                        # Device name and driver
                        dev_name_elem = mp_dev.find("D_NAME")
                        dev_driver_elem = mp_dev.find("D_DRIVER")
                        
                        if dev_name_elem is not None:
                            device_data["name"] = dev_name_elem.text
                            device_data["driver"] = dev_driver_elem.text if dev_driver_elem is not None else ""
                            
                            # Extract device capabilities
                            # Detectors
                            detectors = [det.text for det in mp_dev.findall("D_DET") if det.text]
                            if detectors:
                                device_data["detectors"] = detectors
                            
                            # IF Bandwidth options
                            if_bw = [bw.text for bw in mp_dev.findall("D_IFBW") if bw.text]
                            if if_bw:
                                device_data["if_bandwidth"] = if_bw
                            
                            # RF Attenuator options
                            rf_attn = [attn.text for attn in mp_dev.findall("D_RFATTN") if attn.text]
                            if rf_attn:
                                device_data["rf_attenuator"] = rf_attn
                            
                            # IF Attenuator options
                            if_attn = [attn.text for attn in mp_dev.findall("D_IFATTN") if attn.text]
                            if if_attn:
                                device_data["if_attenuator"] = if_attn
                            
                            # Demodulation modes
                            demod = [dm.text for dm in mp_dev.findall("D_DEMOD") if dm.text]
                            if demod:
                                device_data["demodulation"] = demod
                            
                            # Measurement parameters
                            mparams = [mp.text for mp in mp_dev.findall("D_MPARAM") if mp.text]
                            if mparams:
                                device_data["measurement_params"] = mparams
                            
                            # Measurement time range
                            mtimes = [mt.text for mt in mp_dev.findall("D_MTIME") if mt.text]
                            if mtimes:
                                device_data["measurement_time_range"] = mtimes
                            
                            # Measurement modes
                            modes = [m.text for m in mp_dev.findall("D_MODE") if m.text]
                            if modes:
                                device_data["measurement_modes"] = modes
                            
                            # IF Span options
                            if_span = [sp.text for sp in mp_dev.findall("D_IFSPAN") if sp.text]
                            if if_span:
                                device_data["if_span"] = if_span
                            
                            # DF Bandwidth (for direction finding capable devices)
                            df_bw = [bw.text for bw in mp_dev.findall("D_DFBW") if bw.text]
                            if df_bw:
                                device_data["df_bandwidth"] = df_bw
                            
                            # DF Time
                            df_time = [t.text for t in mp_dev.findall("D_DFTIME") if t.text]
                            if df_time:
                                device_data["df_time"] = df_time
                            
                            # Antenna parameters (for antenna devices)
                            azi_elems = mp_dev.findall("D_AZI")
                            if azi_elems:
                                device_data["azimuth"] = [az.text for az in azi_elems if az.text]
                            
                            ele_elems = mp_dev.findall("D_ELE")
                            if ele_elems:
                                device_data["elevation"] = [el.text for el in ele_elems if el.text]
                            
                            hgt_elems = mp_dev.findall("D_HGT")
                            if hgt_elems:
                                device_data["height"] = [h.text for h in hgt_elems if h.text]
                            
                            pol_elem = mp_dev.find("D_POL")
                            if pol_elem is not None:
                                device_data["polarization"] = pol_elem.text if pol_elem.text else ""
                            
                            devices.append(device_data)
                    
                    path_data["devices"] = devices
                    signal_paths.append(path_data)
                    
                    # Add to global list with station context
                    params["signal_paths"].append({
                        "station": station_data["name"],
                        "station_rmc": station_data["rmc"],
                        "station_pc": station_data["rmc_pc"],
                        **path_data
                    })
                
                station_data["signal_paths"] = signal_paths
                station_data["signal_path_count"] = len(signal_paths)
                params["stations"].append(station_data)
            
            logger.info(f"Parsed {len(params['stations'])} stations with {len(params['signal_paths'])} total signal paths")
            return params
            
        except Exception as e:
            logger.error(f"Error parsing GSP response: {e}", exc_info=True)
            return params

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
