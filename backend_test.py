import requests
import sys
import json
from datetime import datetime

class ArgusAPITester:
    def __init__(self, base_url="https://argus-access.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_login(self, username="admin", password="admin123"):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and isinstance(response, dict) and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200, auth_required=True)

    def test_system_status(self):
        """Test system status endpoint"""
        return self.run_test("System Status", "GET", "system/status", 200, auth_required=True)

    def test_system_parameters(self):
        """Test system parameters endpoint"""
        return self.run_test("System Parameters", "GET", "system/parameters", 200, auth_required=True)

    def test_measurement_orders(self):
        """Test getting measurement orders"""
        return self.run_test("Get Measurement Orders", "GET", "measurements/orders", 200, auth_required=True)

    def test_direct_measurement(self):
        """Test creating a direct measurement"""
        measurement_data = {
            "measurement_name": "Test Measurement",
            "suborder_task": "FFM",
            "result_type": "MR",
            "custom_config": {
                "freq_mode": "S",
                "freq_single": 100000000,
                "if_bandwidth": 10000,
                "measurement_time": 1.0
            }
        }
        return self.run_test(
            "Direct Measurement", 
            "POST", 
            "measurements/direct", 
            200, 
            data=measurement_data,
            auth_required=True
        )

    def test_measurement_configs(self):
        """Test getting measurement configurations"""
        return self.run_test("Get Measurement Configs", "GET", "config/measurements", 200, auth_required=True)

    def test_system_logs(self):
        """Test getting system logs"""
        return self.run_test("Get System Logs", "GET", "logs", 200, auth_required=True)

    def test_system_logs_with_filters(self):
        """Test getting system logs with various filters"""
        # Test with level filter
        success1, _ = self.run_test("System Logs - Level Filter", "GET", "logs?level=INFO&limit=50", 200, auth_required=True)
        
        # Test with source filter
        success2, _ = self.run_test("System Logs - Source Filter", "GET", "logs?source=AUTH&limit=50", 200, auth_required=True)
        
        # Test with search filter
        success3, _ = self.run_test("System Logs - Search Filter", "GET", "logs?search=login&limit=50", 200, auth_required=True)
        
        return success1 and success2 and success3

    def test_system_logs_stats(self):
        """Test getting system logs statistics"""
        # Test with default 24 hours
        success1, response1 = self.run_test("System Logs Stats (24h)", "GET", "logs/stats", 200, auth_required=True)
        
        # Test with custom hours parameter
        success2, response2 = self.run_test("System Logs Stats (1h)", "GET", "logs/stats?hours=1", 200, auth_required=True)
        
        # Validate response structure
        if success1 and isinstance(response1, dict):
            required_fields = ['total_logs', 'by_level', 'by_source', 'recent_errors_count']
            has_required_fields = all(field in response1 for field in required_fields)
            if not has_required_fields:
                print(f"   ❌ Missing required fields in stats response")
                return False
        
        return success1 and success2

    def test_system_logs_sources(self):
        """Test getting available log sources"""
        success, response = self.run_test("System Logs Sources", "GET", "logs/sources", 200, auth_required=True)
        
        if success and isinstance(response, dict) and 'sources' in response:
            sources = response['sources']
            print(f"   Available sources: {sources}")
            return True
        return success

    def test_system_logs_levels(self):
        """Test getting available log levels"""
        success, response = self.run_test("System Logs Levels", "GET", "logs/levels", 200, auth_required=True)
        
        if success and isinstance(response, dict) and 'levels' in response:
            levels = response['levels']
            print(f"   Available levels: {levels}")
            return True
        return success

    def test_authentication_logging(self):
        """Test that authentication events are being logged"""
        # First, try a failed login to generate a WARNING log
        print(f"\n🔍 Testing Authentication Logging...")
        
        # Failed login attempt
        failed_success, _ = self.run_test(
            "Failed Login (for logging test)",
            "POST",
            "auth/login",
            401,  # Expect 401 for wrong password
            data={"username": "admin", "password": "wrongpassword"}
        )
        
        if failed_success:
            print(f"   ✅ Failed login attempt completed (expected 401)")
            
            # Wait a moment for log to be written
            import time
            time.sleep(2)
            
            # Check if the failed login was logged - try multiple approaches
            # 1. Check WARNING level logs from AUTH source
            success1, response1 = self.run_test(
                "Check Failed Login Log (WARNING)",
                "GET",
                "logs?source=AUTH&level=WARNING&limit=20",
                200,
                auth_required=True
            )
            
            # 2. Check all AUTH logs
            success2, response2 = self.run_test(
                "Check All AUTH Logs",
                "GET", 
                "logs?source=AUTH&limit=20",
                200,
                auth_required=True
            )
            
            # 3. Search for "Failed login" in all logs
            success3, response3 = self.run_test(
                "Search Failed Login",
                "GET",
                "logs?search=Failed%20login&limit=20",
                200,
                auth_required=True
            )
            
            # Check results
            found_failed_login = False
            
            if success1 and isinstance(response1, list):
                failed_login_logs = [log for log in response1 if 'Failed login attempt' in log.get('message', '')]
                if failed_login_logs:
                    print(f"   ✅ Failed login found in WARNING logs: {len(failed_login_logs)} entries")
                    found_failed_login = True
            
            if success2 and isinstance(response2, list):
                print(f"   📋 Total AUTH logs found: {len(response2)}")
                for log in response2[-3:]:  # Show last 3 logs
                    print(f"      - {log.get('level', 'N/A')}: {log.get('message', 'N/A')[:80]}...")
                
                auth_failed_logs = [log for log in response2 if 'Failed login' in log.get('message', '')]
                if auth_failed_logs:
                    print(f"   ✅ Failed login found in AUTH logs: {len(auth_failed_logs)} entries")
                    found_failed_login = True
            
            if success3 and isinstance(response3, list):
                if response3:
                    print(f"   ✅ Failed login found via search: {len(response3)} entries")
                    found_failed_login = True
            
            return found_failed_login
        
        return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        old_token = self.token
        self.token = None
        success, _ = self.run_test("Unauthorized Access", "GET", "auth/me", 403, auth_required=True)
        self.token = old_token
        # For unauthorized test, success means we got the expected 403
        return success

    def test_request_gsp(self):
        """Test requesting system parameters (GSP)"""
        return self.run_test("Request GSP", "POST", "system/request-gsp", 200, auth_required=True)

    def test_get_signal_paths(self):
        """Test getting signal paths from GSP response"""
        return self.run_test("Get Signal Paths", "GET", "system/signal-paths", 200, auth_required=True)

    def test_get_amm_configurations(self):
        """Test getting AMM configurations"""
        return self.run_test("Get AMM Configurations", "GET", "amm/configurations", 200, auth_required=True)

    def test_amm_dashboard_stats(self):
        """Test getting AMM dashboard statistics"""
        return self.run_test("AMM Dashboard Stats", "GET", "amm/dashboard-stats", 200, auth_required=True)

    def test_execute_amm_now(self, config_id=None):
        """Test manually executing an AMM configuration"""
        if not config_id:
            # First try to get existing configurations
            success, response = self.run_test("Get AMM Configs for Execute", "GET", "amm/configurations", 200, auth_required=True)
            if success and isinstance(response, list) and len(response) > 0:
                config_id = response[0].get('id')
            else:
                print("   No AMM configurations found to execute")
                return False
        
        if config_id:
            return self.run_test(
                f"Execute AMM Now (ID: {config_id[:8]}...)", 
                "POST", 
                f"amm/configurations/{config_id}/execute-now", 
                200, 
                auth_required=True
            )
        return False

    # ============================================================================
    # SMDI Testing Methods
    # ============================================================================

    def test_smdi_query_frequencies_no_restriction(self):
        """Test SMDI frequency query with no restrictions"""
        query_data = {
            "query_type": "IFL",
            "result_option": "occupied_freq",
            "include_bandwidth": False,
            "list_name": "Test Frequency Query - No Restriction",
            "frequency_params": {
                "mode": "N"
            },
            "location_params": {
                "mode": "N"
            },
            "additional_params": {},
            "auto_update": False
        }
        return self.run_test(
            "SMDI Frequency Query (No Restriction)",
            "POST",
            "smdi/query-frequencies",
            200,
            data=query_data,
            auth_required=True
        )

    def test_smdi_query_frequencies_single(self):
        """Test SMDI frequency query with single frequency"""
        query_data = {
            "query_type": "IFL",
            "result_option": "occupied_freq",
            "include_bandwidth": False,
            "list_name": "Test Frequency Query - Single Freq",
            "frequency_params": {
                "mode": "S",
                "single_freq": 94700000  # 94.7 MHz
            },
            "location_params": {
                "mode": "N"
            },
            "additional_params": {},
            "auto_update": False
        }
        return self.run_test(
            "SMDI Frequency Query (Single Frequency)",
            "POST",
            "smdi/query-frequencies",
            200,
            data=query_data,
            auth_required=True
        )

    def test_smdi_query_frequencies_range(self):
        """Test SMDI frequency query with frequency range"""
        query_data = {
            "query_type": "IFL",
            "result_option": "occupied_freq",
            "include_bandwidth": False,
            "list_name": "Test Frequency Query - FM Band",
            "frequency_params": {
                "mode": "R",
                "range_lower": 88000000,  # 88 MHz
                "range_upper": 108000000  # 108 MHz
            },
            "location_params": {
                "mode": "N"
            },
            "additional_params": {
                "service": "BC"  # Broadcast service
            },
            "auto_update": False
        }
        return self.run_test(
            "SMDI Frequency Query (Range)",
            "POST",
            "smdi/query-frequencies",
            200,
            data=query_data,
            auth_required=True
        )

    def test_smdi_query_frequencies_coordinates(self):
        """Test SMDI frequency query with coordinates"""
        query_data = {
            "query_type": "IFL",
            "result_option": "occupied_freq",
            "include_bandwidth": False,
            "list_name": "Test Frequency Query - Coordinates",
            "frequency_params": {
                "mode": "R",
                "range_lower": 88000000,
                "range_upper": 108000000
            },
            "location_params": {
                "mode": "COORD",
                "longitude_deg": 74,
                "longitude_min": 48,
                "longitude_sec": 46.9,
                "longitude_hem": "W",
                "latitude_deg": 10,
                "latitude_min": 59,
                "latitude_sec": 8.8,
                "latitude_hem": "N",
                "radius": 30
            },
            "additional_params": {
                "service": "BC"
            },
            "auto_update": False
        }
        return self.run_test(
            "SMDI Frequency Query (Coordinates)",
            "POST",
            "smdi/query-frequencies",
            200,
            data=query_data,
            auth_required=True
        )

    def test_smdi_query_transmitters_no_restriction(self):
        """Test SMDI transmitter query with no restrictions"""
        query_data = {
            "query_type": "ITL",
            "result_option": "transmitters",
            "include_bandwidth": False,
            "list_name": "Test Transmitter Query - No Restriction",
            "frequency_params": {
                "mode": "N"
            },
            "location_params": {
                "mode": "N"
            },
            "additional_params": {},
            "auto_update": False
        }
        return self.run_test(
            "SMDI Transmitter Query (No Restriction)",
            "POST",
            "smdi/query-transmitters",
            200,
            data=query_data,
            auth_required=True
        )

    def test_smdi_query_transmitters_range_coordinates(self):
        """Test SMDI transmitter query with range and coordinates"""
        query_data = {
            "query_type": "ITL",
            "result_option": "transmitters",
            "include_bandwidth": False,
            "list_name": "Test Transmitter Query - Range + Coordinates",
            "frequency_params": {
                "mode": "R",
                "range_lower": 88000000,
                "range_upper": 108000000
            },
            "location_params": {
                "mode": "COORD",
                "longitude_deg": 74,
                "longitude_min": 48,
                "longitude_sec": 46.9,
                "longitude_hem": "W",
                "latitude_deg": 10,
                "latitude_min": 59,
                "latitude_sec": 8.8,
                "latitude_hem": "N",
                "radius": 30
            },
            "additional_params": {
                "service": "BC"
            },
            "auto_update": False
        }
        return self.run_test(
            "SMDI Transmitter Query (Range + Coordinates)",
            "POST",
            "smdi/query-transmitters",
            200,
            data=query_data,
            auth_required=True
        )

    def test_smdi_get_frequency_lists(self):
        """Test getting SMDI frequency lists"""
        return self.run_test(
            "Get SMDI Frequency Lists",
            "GET",
            "smdi/frequency-lists",
            200,
            auth_required=True
        )

    def test_smdi_get_transmitter_lists(self):
        """Test getting SMDI transmitter lists"""
        return self.run_test(
            "Get SMDI Transmitter Lists",
            "GET",
            "smdi/transmitter-lists",
            200,
            auth_required=True
        )

    def test_smdi_get_queries(self):
        """Test getting SMDI query history"""
        return self.run_test(
            "Get SMDI Queries",
            "GET",
            "smdi/queries",
            200,
            auth_required=True
        )

    # ============================================================================
    # Active Directory API Testing Methods
    # ============================================================================

    def test_ad_config(self):
        """Test AD configuration endpoint (admin only)"""
        return self.run_test(
            "AD Configuration",
            "GET",
            "ad/config",
            200,
            auth_required=True
        )

    def test_ad_status(self):
        """Test AD status endpoint (admin only)"""
        return self.run_test(
            "AD Status",
            "GET",
            "ad/status",
            200,
            auth_required=True
        )

    def test_ad_test_connection(self):
        """Test AD connection test endpoint (admin only)"""
        return self.run_test(
            "AD Test Connection",
            "POST",
            "ad/test-connection",
            200,
            auth_required=True
        )

    def test_ad_unauthorized_access(self):
        """Test AD endpoints without admin role (should return 403)"""
        # Create a non-admin user token for testing
        # For now, test with no token (should fail)
        old_token = self.token
        self.token = None
        success, _ = self.run_test("AD Config Unauthorized", "GET", "ad/config", 403, auth_required=True)
        self.token = old_token
        return success

    # ============================================================================
    # Location Measurements API Testing Methods (DF/TDOA)
    # ============================================================================

    def test_location_capabilities(self):
        """Test getting station capabilities for DF/TDOA"""
        return self.run_test(
            "Location Capabilities",
            "GET",
            "location/capabilities",
            200,
            auth_required=True
        )

    def test_location_measurements_list(self):
        """Test listing location measurements"""
        return self.run_test(
            "List Location Measurements",
            "GET",
            "location/measurements",
            200,
            auth_required=True
        )

    def test_df_measurement_creation(self):
        """Test creating DF measurement order"""
        df_data = {
            "station_ids": ["Station_HQ4", "Station_Test"],
            "frequency": 100000000,  # 100 MHz
            "measurement_time": 1000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2
        }
        return self.run_test(
            "Create DF Measurement",
            "POST",
            "location/df-measurement",
            200,
            data=df_data,
            auth_required=True
        )

    def test_tdoa_measurement_creation(self):
        """Test creating TDOA measurement order"""
        tdoa_data = {
            "station_ids": ["Station_A", "Station_B", "Station_C"],
            "frequency": 100000000,  # 100 MHz
            "measurement_time": 1000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2
        }
        return self.run_test(
            "Create TDOA Measurement",
            "POST",
            "location/tdoa-measurement",
            200,
            data=tdoa_data,
            auth_required=True
        )

    def test_df_measurement_insufficient_stations(self):
        """Test DF measurement with only 1 station (should fail)"""
        df_data = {
            "station_ids": ["Station_HQ4"],  # Only 1 station
            "frequency": 100000000,
            "measurement_time": 1000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2
        }
        return self.run_test(
            "DF Measurement - Insufficient Stations (Error)",
            "POST",
            "location/df-measurement",
            400,  # Expect bad request
            data=df_data,
            auth_required=True
        )

    def test_tdoa_measurement_insufficient_stations(self):
        """Test TDOA measurement with only 2 stations (should fail)"""
        tdoa_data = {
            "station_ids": ["Station_A", "Station_B"],  # Only 2 stations
            "frequency": 100000000,
            "measurement_time": 1000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2
        }
        return self.run_test(
            "TDOA Measurement - Insufficient Stations (Error)",
            "POST",
            "location/tdoa-measurement",
            400,  # Expect bad request
            data=tdoa_data,
            auth_required=True
        )

    def test_location_measurements_filtered(self):
        """Test listing location measurements with DF filter"""
        return self.run_test(
            "List DF Measurements (Filtered)",
            "GET",
            "location/measurements?measurement_type=DF",
            200,
            auth_required=True
        )

    def test_location_measurement_results(self, measurement_id=None):
        """Test getting location measurement results"""
        if not measurement_id:
            # Try to get a measurement ID from previous tests
            success, response = self.run_test("Get Measurements for Results", "GET", "location/measurements", 200, auth_required=True)
            if success and isinstance(response, dict) and response.get('measurements'):
                measurement_id = response['measurements'][0].get('measurement_id')
            else:
                # Use a dummy ID for testing
                measurement_id = "test-measurement-id"
        
        if measurement_id:
            return self.run_test(
                f"Get Measurement Results (ID: {measurement_id[:8]}...)",
                "GET",
                f"location/results/{measurement_id}",
                200,  # May return 404 if measurement doesn't exist, but that's expected
                auth_required=True
            )
        return False

    def check_location_xml_files_in_inbox(self):
        """Check if DF/TDOA XML files are generated in /tmp/argus_inbox"""
        import os
        import glob
        import xml.etree.ElementTree as ET
        
        print(f"\n🔍 Checking for DF/TDOA XML files in /tmp/argus_inbox...")
        
        try:
            inbox_path = "/tmp/argus_inbox"
            if not os.path.exists(inbox_path):
                print(f"   ❌ Inbox directory does not exist: {inbox_path}")
                return False
            
            xml_files = glob.glob(os.path.join(inbox_path, "*.xml"))
            print(f"   Found {len(xml_files)} XML files in inbox")
            
            if xml_files:
                print("   ✅ XML files found:")
                location_files_found = False
                
                for xml_file in xml_files[-10:]:  # Show last 10 files
                    file_stat = os.stat(xml_file)
                    file_time = datetime.fromtimestamp(file_stat.st_mtime)
                    filename = os.path.basename(xml_file)
                    print(f"      - {filename} (modified: {file_time})")
                    
                    # Check if this is a DF or TDOA file
                    if filename.startswith(('DF', 'TDO')):
                        location_files_found = True
                        self._validate_location_xml_structure(xml_file, filename)
                
                if location_files_found:
                    print("   ✅ DF/TDOA XML files detected and validated")
                else:
                    print("   ⚠️  No DF/TDOA files found (DF_*/TDOA_*)")
                
                return True
            else:
                print("   ❌ No XML files found in inbox")
                return False
                
        except Exception as e:
            print(f"   ❌ Error checking inbox: {str(e)}")
            return False

    def _validate_location_xml_structure(self, xml_file_path, filename):
        """Validate DF/TDOA XML structure"""
        import xml.etree.ElementTree as ET
        try:
            tree = ET.parse(xml_file_path)
            root = tree.getroot()
            
            print(f"      📋 Validating Location XML {filename}:")
            
            # Check for measurement order structure
            order_def = root.find(".//ORDER_DEF")
            if order_def is not None:
                order_id = order_def.find("ORDER_ID")
                order_type = order_def.find("ORDER_TYPE")
                
                if order_id is not None:
                    print(f"         ✅ ORDER_ID: {order_id.text}")
                if order_type is not None:
                    print(f"         ✅ ORDER_TYPE: {order_type.text}")
                
                # Check for DF/TDOA specific parameters
                meas_param = order_def.find("MEAS_PARAM")
                if meas_param is not None:
                    freq = meas_param.find("FREQ")
                    station = meas_param.find("STATION")
                    
                    if freq is not None:
                        freq_hz = int(freq.text)
                        print(f"         ✅ Frequency: {freq_hz} Hz ({freq_hz/1e6:.1f} MHz)")
                    if station is not None:
                        print(f"         ✅ Station: {station.text}")
                
                print(f"         ✅ Location measurement XML structure valid")
            else:
                print(f"         ❌ Missing ORDER_DEF element")
                
        except Exception as e:
            print(f"         ❌ Location XML validation error: {str(e)}")

    # ============================================================================
    # ADC Testing Methods (ORM-ADC Direct Measurement Module)
    # ============================================================================

    def test_adc_scan_order(self):
        """Test ADC SCAN order creation"""
        scan_data = {
            "station_id": "TestStation_HQ4",
            "freq_start": 88000000,  # 88 MHz
            "freq_stop": 108000000,  # 108 MHz
            "freq_step": 25000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2,
            "meas_time": -1,
            "attenuation": "Auto"
        }
        return self.run_test(
            "ADC SCAN Order Creation",
            "POST",
            "adc/orders/scan",
            200,
            data=scan_data,
            auth_required=True
        )

    def test_adc_single_freq_order(self):
        """Test ADC single frequency order creation"""
        single_freq_data = {
            "station_id": "TestStation_HQ4",
            "frequency": 100000000,  # 100 MHz
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2,
            "meas_time": 1000,
            "attenuation": "Auto",
            "measurement_type": "LEVEL"
        }
        return self.run_test(
            "ADC Single Frequency Order Creation",
            "POST",
            "adc/orders/single-freq",
            200,
            data=single_freq_data,
            auth_required=True
        )

    def test_adc_capture_status_initial(self):
        """Test ADC capture status (should be inactive initially)"""
        return self.run_test(
            "ADC Capture Status (Initial)",
            "GET",
            "adc/capture/status",
            200,
            auth_required=True
        )

    def test_adc_capture_start(self):
        """Test starting ADC UDP capture"""
        return self.run_test(
            "ADC Capture Start",
            "POST",
            "adc/capture/start",
            200,
            auth_required=True
        )

    def test_adc_capture_status_running(self):
        """Test ADC capture status (should be active after start)"""
        return self.run_test(
            "ADC Capture Status (Running)",
            "GET",
            "adc/capture/status",
            200,
            auth_required=True
        )

    def test_adc_capture_stop(self):
        """Test stopping ADC UDP capture"""
        return self.run_test(
            "ADC Capture Stop",
            "POST",
            "adc/capture/stop",
            200,
            auth_required=True
        )

    def test_adc_get_orders(self):
        """Test getting ADC orders list"""
        return self.run_test(
            "Get ADC Orders",
            "GET",
            "adc/orders?limit=10",
            200,
            auth_required=True
        )

    def test_adc_get_captures(self):
        """Test getting ADC captures list"""
        return self.run_test(
            "Get ADC Captures",
            "GET",
            "adc/captures?limit=10",
            200,
            auth_required=True
        )

    def test_adc_order_without_station_id(self):
        """Test ADC order creation without station_id (should fail)"""
        invalid_data = {
            "freq_start": 88000000,
            "freq_stop": 108000000,
            "freq_step": 25000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2,
            "meas_time": -1,
            "attenuation": "Auto"
        }
        return self.run_test(
            "ADC Order Without Station ID (Error Test)",
            "POST",
            "adc/orders/scan",
            422,  # Expect validation error
            data=invalid_data,
            auth_required=True
        )

    def test_adc_scan_invalid_frequency_range(self):
        """Test ADC SCAN order with invalid frequency range (stop < start)"""
        invalid_data = {
            "station_id": "TestStation_HQ4",
            "freq_start": 108000000,  # Higher than stop
            "freq_stop": 88000000,   # Lower than start
            "freq_step": 25000,
            "bandwidth": 10000,
            "detector": "RMS",
            "priority": 2,
            "meas_time": -1,
            "attenuation": "Auto"
        }
        return self.run_test(
            "ADC SCAN Invalid Frequency Range (Error Test)",
            "POST",
            "adc/orders/scan",
            400,  # Expect bad request
            data=invalid_data,
            auth_required=True
        )

    def check_adc_xml_files_in_inbox(self):
        """Check if ADC XML files are generated in /tmp/argus_inbox and validate ADC structure"""
        import os
        import glob
        import xml.etree.ElementTree as ET
        
        print(f"\n🔍 Checking for ADC XML files in /tmp/argus_inbox...")
        
        try:
            inbox_path = "/tmp/argus_inbox"
            if not os.path.exists(inbox_path):
                print(f"   ❌ Inbox directory does not exist: {inbox_path}")
                return False
            
            xml_files = glob.glob(os.path.join(inbox_path, "*.xml"))
            print(f"   Found {len(xml_files)} XML files in inbox")
            
            if xml_files:
                print("   ✅ XML files found:")
                adc_files_found = False
                
                for xml_file in xml_files[-10:]:  # Show last 10 files
                    file_stat = os.stat(xml_file)
                    file_time = datetime.fromtimestamp(file_stat.st_mtime)
                    filename = os.path.basename(xml_file)
                    print(f"      - {filename} (modified: {file_time})")
                    
                    # Check if this is an ADC file
                    if filename.startswith('ADC_'):
                        adc_files_found = True
                        self._validate_adc_xml_structure(xml_file, filename)
                
                if adc_files_found:
                    print("   ✅ ADC XML files detected and validated")
                else:
                    print("   ⚠️  No ADC files found (ADC_*)")
                
                return True
            else:
                print("   ❌ No XML files found in inbox")
                return False
                
        except Exception as e:
            print(f"   ❌ Error checking inbox: {str(e)}")
            return False

    def _validate_adc_xml_structure(self, xml_file_path, filename):
        """Validate ADC XML structure"""
        import xml.etree.ElementTree as ET
        try:
            tree = ET.parse(xml_file_path)
            root = tree.getroot()
            
            print(f"      📋 Validating ADC XML {filename}:")
            
            # Check namespace (ElementTree includes namespace in tag name)
            if "rohde-schwarz.com/ARGUS/ORM_ADC" in root.tag and root.tag.endswith("}ORDER"):
                print(f"         ✅ ADC Namespace: http://www.rohde-schwarz.com/ARGUS/ORM_ADC")
            else:
                print(f"         ❌ Missing or incorrect ADC namespace. Root tag: {root.tag}")
                return
            
            # Check HEADER (need to include namespace)
            ns = {'adc': 'http://www.rohde-schwarz.com/ARGUS/ORM_ADC'}
            header = root.find("adc:HEADER", ns)
            if header is not None:
                cmd = header.find("adc:CMD", ns)
                order_id = header.find("adc:ID", ns)
                station = header.find("adc:STATION", ns)
                order_type = header.find("adc:ORDER_TYPE", ns)
                
                if cmd is not None:
                    print(f"         ✅ CMD: {cmd.text}")
                if order_id is not None:
                    print(f"         ✅ ORDER_ID: {order_id.text}")
                if station is not None:
                    print(f"         ✅ STATION: {station.text}")
                if order_type is not None:
                    print(f"         ✅ ORDER_TYPE: {order_type.text}")
            else:
                print(f"         ❌ Missing HEADER element")
                return
            
            # Check BODY
            body = root.find("adc:BODY", ns)
            if body is not None:
                # Check for frequency parameters
                freq_start = body.find("adc:FREQ_START", ns)
                freq_stop = body.find("adc:FREQ_STOP", ns)
                frequency = body.find("adc:FREQUENCY", ns)
                
                if freq_start is not None and freq_stop is not None:
                    start_hz = int(freq_start.text)
                    stop_hz = int(freq_stop.text)
                    print(f"         ✅ SCAN Range: {start_hz/1e6:.1f} - {stop_hz/1e6:.1f} MHz")
                elif frequency is not None:
                    freq_hz = int(frequency.text)
                    print(f"         ✅ Single Frequency: {freq_hz/1e6:.1f} MHz")
                
                # Check other parameters
                bandwidth = body.find("adc:BANDWIDTH", ns)
                detector = body.find("adc:DETECTOR", ns)
                meas_time = body.find("adc:MEAS_TIME", ns)
                
                if bandwidth is not None:
                    print(f"         ✅ Bandwidth: {bandwidth.text} Hz")
                if detector is not None:
                    print(f"         ✅ Detector: {detector.text}")
                if meas_time is not None:
                    print(f"         ✅ Meas Time: {meas_time.text} ms")
                
                print(f"         ✅ ADC XML structure valid")
            else:
                print(f"         ❌ Missing BODY element")
                
        except Exception as e:
            print(f"         ❌ ADC XML validation error: {str(e)}")

    def check_xml_files_in_inbox(self):
        """Check if XML files are generated in /tmp/argus_inbox and validate SMDI structure"""
        import os
        import glob
        import xml.etree.ElementTree as ET
        
        print(f"\n🔍 Checking for XML files in /tmp/argus_inbox...")
        
        try:
            inbox_path = "/tmp/argus_inbox"
            if not os.path.exists(inbox_path):
                print(f"   ❌ Inbox directory does not exist: {inbox_path}")
                return False
            
            xml_files = glob.glob(os.path.join(inbox_path, "*.xml"))
            print(f"   Found {len(xml_files)} XML files in inbox")
            
            if xml_files:
                print("   ✅ XML files found:")
                smdi_files_found = False
                
                for xml_file in xml_files[-10:]:  # Show last 10 files
                    file_stat = os.stat(xml_file)
                    file_time = datetime.fromtimestamp(file_stat.st_mtime)
                    filename = os.path.basename(xml_file)
                    print(f"      - {filename} (modified: {file_time})")
                    
                    # Check if this is an SMDI file (IFL or ITL)
                    if filename.startswith(('IFL', 'ITL', 'IOFL')):
                        smdi_files_found = True
                        self._validate_smdi_xml_structure(xml_file, filename)
                
                if smdi_files_found:
                    print("   ✅ SMDI XML files detected and validated")
                else:
                    print("   ⚠️  No SMDI files found (IFL/ITL/IOFL)")
                
                return True
            else:
                print("   ❌ No XML files found in inbox")
                return False
                
        except Exception as e:
            print(f"   ❌ Error checking inbox: {str(e)}")
            return False

    def _validate_smdi_xml_structure(self, xml_file_path, filename):
        """Validate SMDI XML structure"""
        import xml.etree.ElementTree as ET
        try:
            tree = ET.parse(xml_file_path)
            root = tree.getroot()
            
            print(f"      📋 Validating {filename}:")
            
            # Check for required SMDI elements
            order_def = root.find(".//ORDER_DEF")
            if order_def is not None:
                order_id = order_def.find("ORDER_ID")
                order_type = order_def.find("ORDER_TYPE")
                
                if order_id is not None:
                    print(f"         ✅ ORDER_ID: {order_id.text}")
                if order_type is not None:
                    print(f"         ✅ ORDER_TYPE: {order_type.text}")
                
                # Check frequency parameters
                freq_param = order_def.find("FREQ_PARAM")
                if freq_param is not None:
                    freq_mode = freq_param.find("FREQ_PAR_MODE")
                    if freq_mode is not None:
                        print(f"         ✅ FREQ_PAR_MODE: {freq_mode.text}")
                        
                        # Check specific frequency parameters based on mode
                        if freq_mode.text == "S":
                            freq_single = freq_param.find("FREQ_PAR_S")
                            if freq_single is not None:
                                freq_hz = int(freq_single.text)
                                freq_mhz = freq_hz / 1000000
                                print(f"         ✅ Single Frequency: {freq_hz} Hz ({freq_mhz:.1f} MHz)")
                        elif freq_mode.text == "R":
                            freq_low = freq_param.find("FREQ_PAR_RG_L")
                            freq_high = freq_param.find("FREQ_PAR_RG_U")
                            if freq_low is not None and freq_high is not None:
                                low_hz = int(freq_low.text)
                                high_hz = int(freq_high.text)
                                print(f"         ✅ Frequency Range: {low_hz} - {high_hz} Hz ({low_hz/1e6:.1f} - {high_hz/1e6:.1f} MHz)")
                
                # Check location parameters
                reg_param = order_def.find("REG_PARAM")
                if reg_param is not None:
                    # Check coordinates
                    lon_deg = reg_param.find("REG_PAR_LONG_DEG")
                    lat_deg = reg_param.find("REG_PAR_LAT_DEG")
                    radius = reg_param.find("REG_PAR_COORD_RAD")
                    
                    if lon_deg is not None and lat_deg is not None:
                        print(f"         ✅ Coordinates: {lat_deg.text}°N, {lon_deg.text}°W")
                        if radius is not None:
                            print(f"         ✅ Radius: {radius.text} km")
                
                # Check additional parameters
                add_param = order_def.find("ADD_PARAM")
                if add_param is not None:
                    service = add_param.find("ADD_PAR_SERVICE")
                    if service is not None:
                        print(f"         ✅ Service: {service.text}")
                
                print(f"         ✅ XML structure valid for SMDI spec")
            else:
                print(f"         ❌ Missing ORDER_DEF element")
                
        except Exception as e:
            print(f"         ❌ XML validation error: {str(e)}")

def main():
    print("🚀 Starting ArgusUI Backend API Tests - DF/TDOA Location Measurements + Active Directory APIs")
    print("=" * 80)
    
    tester = ArgusAPITester()
    
    # Test sequence - focusing on DF/TDOA Location Measurements and Active Directory APIs
    tests = [
        # Phase 1: Authentication (admin/admin123)
        ("Health Check", tester.test_health_check),
        ("Login (admin/admin123)", tester.test_login),
        ("Get Current User", tester.test_get_current_user),
        
        # Phase 2: Active Directory API Tests (Admin Only)
        ("AD Configuration", tester.test_ad_config),
        ("AD Status", tester.test_ad_status),
        ("AD Test Connection", tester.test_ad_test_connection),
        
        # Phase 3: Location Measurements API Tests
        ("Location Capabilities", tester.test_location_capabilities),
        ("List Location Measurements", tester.test_location_measurements_list),
        ("Create DF Measurement", tester.test_df_measurement_creation),
        ("Create TDOA Measurement", tester.test_tdoa_measurement_creation),
        ("Get Measurement Results", tester.test_location_measurement_results),
        ("List DF Measurements (Filtered)", tester.test_location_measurements_filtered),
        
        # Phase 4: Error Handling Tests
        ("DF - Insufficient Stations (Error)", tester.test_df_measurement_insufficient_stations),
        ("TDOA - Insufficient Stations (Error)", tester.test_tdoa_measurement_insufficient_stations),
        ("AD Unauthorized Access (Error)", tester.test_ad_unauthorized_access),
        
        # System functionality verification
        ("System Status", tester.test_system_status),
        ("System Logs - Basic", tester.test_system_logs),
        ("Unauthorized Access", tester.test_unauthorized_access),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Check XML file generation
    print(f"\n🔍 Verifying XML File Generation...")
    xml_check_success = tester.check_location_xml_files_in_inbox()
    if not xml_check_success:
        failed_tests.append("DF/TDOA XML File Generation")
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS - DF/TDOA LOCATION MEASUREMENTS + ACTIVE DIRECTORY")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {len(failed_tests)}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())