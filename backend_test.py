import requests
import sys
import json
from datetime import datetime

class ArgusAPITester:
    def __init__(self, base_url="https://specmon-dash.preview.emergentagent.com"):
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

    def check_xml_files_in_inbox(self):
        """Check if XML files are generated in /tmp/argus_inbox"""
        import os
        import glob
        
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
                for xml_file in xml_files[-5:]:  # Show last 5 files
                    file_stat = os.stat(xml_file)
                    file_time = datetime.fromtimestamp(file_stat.st_mtime)
                    print(f"      - {os.path.basename(xml_file)} (modified: {file_time})")
                return True
            else:
                print("   ❌ No XML files found in inbox")
                return False
                
        except Exception as e:
            print(f"   ❌ Error checking inbox: {str(e)}")
            return False

def main():
    print("🚀 Starting ArgusUI Backend API Tests")
    print("=" * 50)
    
    tester = ArgusAPITester()
    
    # Test sequence - focusing on GSP and AMM functionality as requested
    tests = [
        ("Health Check", tester.test_health_check),
        ("Login", tester.test_login),
        ("Get Current User", tester.test_get_current_user),
        ("System Status", tester.test_system_status),
        ("Request GSP", tester.test_request_gsp),
        ("Get Signal Paths", tester.test_get_signal_paths),
        ("AMM Dashboard Stats", tester.test_amm_dashboard_stats),
        ("Get AMM Configurations", tester.test_get_amm_configurations),
        ("Execute AMM Now", tester.test_execute_amm_now),
        ("Check XML Files in Inbox", tester.check_xml_files_in_inbox),
        ("System Parameters", tester.test_system_parameters),
        ("Measurement Orders", tester.test_measurement_orders),
        ("Direct Measurement", tester.test_direct_measurement),
        ("Measurement Configs", tester.test_measurement_configs),
        ("System Logs", tester.test_system_logs),
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
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 FINAL TEST RESULTS")
    print("=" * 50)
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