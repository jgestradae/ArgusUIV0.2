#!/usr/bin/env python3
"""
Test GSP endpoints after data has been processed
"""

import requests
import json

class GSPEndpointTester:
    def __init__(self, base_url="https://argus-connect.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def login(self):
        """Login and get token"""
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            print(f"✅ Login successful")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False

    def test_signal_paths(self):
        """Test signal paths endpoint"""
        print(f"\n🛤️ Testing signal paths endpoint...")
        
        headers = {'Authorization': f'Bearer {self.token}'}
        response = self.session.get(f"{self.base_url}/api/system/signal-paths", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                signal_paths = data.get('data', {}).get('signal_paths', [])
                stations = data.get('data', {}).get('stations', [])
                
                print(f"✅ Signal paths endpoint working")
                print(f"   Found {len(signal_paths)} signal paths")
                print(f"   Found {len(stations)} stations")
                
                # Show details
                for path in signal_paths:
                    freq_range = f"{path.get('freq_min', 0)/1e6:.1f}-{path.get('freq_max', 0)/1e6:.1f} MHz"
                    print(f"   - {path.get('name')} at {path.get('station')} ({freq_range})")
                
                return len(signal_paths) > 0
            else:
                print(f"❌ Signal paths request unsuccessful: {data.get('message')}")
                return False
        else:
            print(f"❌ Signal paths request failed: {response.status_code}")
            return False

    def test_system_parameters(self):
        """Test system parameters endpoint"""
        print(f"\n⚙️ Testing system parameters endpoint...")
        
        headers = {'Authorization': f'Bearer {self.token}'}
        response = self.session.get(f"{self.base_url}/api/system/parameters", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                params_data = data.get('data', {})
                stations = params_data.get('stations', [])
                signal_paths = params_data.get('signal_paths', [])
                
                print(f"✅ System parameters endpoint working")
                print(f"   Found {len(stations)} stations")
                print(f"   Found {len(signal_paths)} signal paths")
                
                # Show station details
                for station in stations:
                    print(f"   - Station: {station.get('name')} ({station.get('type')}) at {station.get('latitude')}, {station.get('longitude')}")
                
                return len(stations) > 0 and len(signal_paths) > 0
            else:
                print(f"❌ System parameters request unsuccessful: {data.get('message')}")
                return False
        else:
            print(f"❌ System parameters request failed: {response.status_code}")
            return False

def main():
    print("🚀 Testing GSP Endpoints After Data Processing")
    print("=" * 50)
    
    tester = GSPEndpointTester()
    
    if not tester.login():
        return 1
    
    signal_paths_ok = tester.test_signal_paths()
    system_params_ok = tester.test_system_parameters()
    
    print(f"\n📊 Results:")
    print(f"✅ Signal Paths Endpoint: {'PASS' if signal_paths_ok else 'FAIL'}")
    print(f"✅ System Parameters Endpoint: {'PASS' if system_params_ok else 'FAIL'}")
    
    if signal_paths_ok and system_params_ok:
        print(f"\n🎉 GSP workflow endpoints are working correctly!")
        print(f"   - GSP data is properly stored in MongoDB")
        print(f"   - Signal paths are available for AMM wizard")
        print(f"   - System parameters can be retrieved")
        return 0
    else:
        print(f"\n❌ Some GSP endpoints are not working properly")
        return 1

if __name__ == "__main__":
    exit(main())