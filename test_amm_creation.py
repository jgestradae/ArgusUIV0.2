#!/usr/bin/env python3
"""
Test script to create an AMM configuration and test execution
"""
import requests
import json
import sys

def create_test_amm_config(base_url, token):
    """Create a test AMM configuration"""
    
    # AMM configuration data
    amm_data = {
        "name": "Test AMM Configuration",
        "description": "Test AMM for backend testing",
        "timing_definition": {
            "name": "Test Timing",
            "schedule_type": "always",
            "continue_after_restart": True
        },
        "measurement_definition": {
            "name": "Test Measurement",
            "measurement_type": "FFM",
            "device_name": "ESMD_Receiver_01",
            "station_names": ["Station_001"],
            "frequency_mode": "S",
            "frequency_single": 100000000,
            "receiver_config": {
                "if_bandwidth": 10000,
                "rf_attenuation": "Auto",
                "detector": "Average",
                "measurement_time": 1.0
            },
            "antenna_config": {
                "antenna_path": "ANT1"
            },
            "measured_parameters": ["Level"]
        },
        "range_definition": {
            "name": "Test Range",
            "system_path": "SYS_PATH_1",
            "frequency_start": 88000000,
            "frequency_end": 108000000
        },
        "general_definition": {
            "name": "Test General",
            "result_config": {
                "graphic_type": "yt_plot",
                "display_raw_data": True,
                "save_measurement_results": True,
                "file_format": "xml",
                "save_to_database": True
            }
        }
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    url = f"{base_url}/api/amm/configurations"
    
    print(f"Creating AMM configuration at {url}")
    response = requests.post(url, json=amm_data, headers=headers)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        config = response.json()
        print(f"✅ AMM Configuration created successfully!")
        print(f"   ID: {config['id']}")
        print(f"   Name: {config['name']}")
        return config['id']
    else:
        print(f"❌ Failed to create AMM configuration")
        try:
            error = response.json()
            print(f"   Error: {json.dumps(error, indent=2)}")
        except:
            print(f"   Error: {response.text}")
        return None

def test_amm_execution(base_url, token, config_id):
    """Test AMM execution"""
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    url = f"{base_url}/api/amm/configurations/{config_id}/execute-now"
    
    print(f"\nExecuting AMM configuration {config_id}")
    response = requests.post(url, headers=headers)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ AMM execution triggered successfully!")
        print(f"   Message: {result.get('message', 'No message')}")
        return True
    else:
        print(f"❌ Failed to execute AMM configuration")
        try:
            error = response.json()
            print(f"   Error: {json.dumps(error, indent=2)}")
        except:
            print(f"   Error: {response.text}")
        return False

def login(base_url):
    """Login and get token"""
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        return data['access_token']
    else:
        print(f"Login failed: {response.status_code}")
        return None

def main():
    base_url = "https://argus-spectrum.preview.emergentagent.com"
    
    print("🚀 Testing AMM Configuration Creation and Execution")
    print("=" * 60)
    
    # Login
    print("Logging in...")
    token = login(base_url)
    if not token:
        print("❌ Login failed")
        return 1
    
    print("✅ Login successful")
    
    # Create AMM configuration
    config_id = create_test_amm_config(base_url, token)
    if not config_id:
        print("❌ Failed to create AMM configuration")
        return 1
    
    # Test execution
    success = test_amm_execution(base_url, token, config_id)
    if not success:
        print("❌ Failed to execute AMM configuration")
        return 1
    
    print("\n✅ All AMM tests completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())