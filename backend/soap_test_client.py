"""
SOAP Test Client for ArgusUI Web Services
Demonstrates SOAP service consumption and testing
"""

from zeep import Client, Settings
from zeep.wsse.username import UsernameToken
from requests import Session
from requests.auth import HTTPBasicAuth
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logging.getLogger('zeep').setLevel(logging.WARNING)

# Configuration
SOAP_ENDPOINT = "http://localhost:8001/soap"
WSDL_URL = "http://localhost:8001/wsdl"
AUTH_TOKEN = "argus_soap_token_2025"  # Default SOAP API token


class ArgusSOAPClient:
    """
    Client for consuming ArgusUI SOAP Web Services
    """
    
    def __init__(self, endpoint=SOAP_ENDPOINT, wsdl_url=WSDL_URL, auth_token=AUTH_TOKEN):
        """
        Initialize SOAP client
        
        Args:
            endpoint: SOAP endpoint URL
            wsdl_url: WSDL document URL
            auth_token: Authentication token for WS-Security
        """
        self.endpoint = endpoint
        self.wsdl_url = wsdl_url
        self.auth_token = auth_token
        
        # Create session
        self.session = Session()
        
        # Create Zeep client
        settings = Settings(strict=False, xml_huge_tree=True)
        try:
            self.client = Client(wsdl_url, settings=settings, transport=None)
            self.service = self.client.create_service(
                '{http://argus.ui/soap}ArgusSOAPService',
                endpoint
            )
            print(f"✅ SOAP client initialized: {endpoint}")
        except Exception as e:
            print(f"⚠️  Could not load WSDL, using direct endpoint: {e}")
            self.client = None
            self.service = None
    
    def test_get_system_parameters(self):
        """Test GetSystemParameters service"""
        print("\n" + "="*70)
        print("Testing: GetSystemParameters")
        print("="*70)
        
        try:
            if self.service:
                result = self.service.GetSystemParameters(auth_token=self.auth_token)
            else:
                # Manual SOAP request
                import requests
                soap_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetSystemParameters>
            <ns:auth_token>{self.auth_token}</ns:auth_token>
        </ns:GetSystemParameters>
    </soap:Body>
</soap:Envelope>"""
                
                response = requests.post(
                    self.endpoint,
                    data=soap_request,
                    headers={'Content-Type': 'application/soap+xml'}
                )
                print(f"Status: {response.status_code}")
                print(f"Response:\n{response.text[:500]}")
                return
            
            print(f"✅ Success! Retrieved {len(result)} station(s)")
            for i, station in enumerate(result, 1):
                print(f"\nStation {i}:")
                print(f"  ID: {station.station_id}")
                print(f"  Name: {station.station_name}")
                print(f"  Type: {station.station_type}")
                print(f"  Location: {station.location}")
                print(f"  Coordinates: {station.latitude}, {station.longitude}")
                print(f"  Status: {station.status}")
                print(f"  Capabilities: {station.capabilities}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def test_get_station_status(self, station_id="HQ4"):
        """Test GetStationStatus service"""
        print("\n" + "="*70)
        print(f"Testing: GetStationStatus (Station: {station_id})")
        print("="*70)
        
        try:
            if self.service:
                result = self.service.GetStationStatus(
                    auth_token=self.auth_token,
                    station_id=station_id
                )
            else:
                # Manual SOAP request
                import requests
                soap_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetStationStatus>
            <ns:auth_token>{self.auth_token}</ns:auth_token>
            <ns:station_id>{station_id}</ns:station_id>
        </ns:GetStationStatus>
    </soap:Body>
</soap:Envelope>"""
                
                response = requests.post(
                    self.endpoint,
                    data=soap_request,
                    headers={'Content-Type': 'application/soap+xml'}
                )
                print(f"Status: {response.status_code}")
                print(f"Response:\n{response.text[:500]}")
                return
            
            print(f"✅ Success!")
            print(f"\nStation Status:")
            print(f"  ID: {result.station_id}")
            print(f"  Name: {result.station_name}")
            print(f"  Online: {result.is_online}")
            print(f"  Status: {result.status}")
            print(f"  Current Task: {result.current_task}")
            print(f"  Alarm State: {result.alarm_state}")
            print(f"  Connection Quality: {result.connection_quality}%")
            print(f"  Last Heartbeat: {result.last_heartbeat}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def test_schedule_measurement(self):
        """Test ScheduleMeasurement service"""
        print("\n" + "="*70)
        print("Testing: ScheduleMeasurement")
        print("="*70)
        
        try:
            # Create measurement request
            measurement_request = {
                'measurement_id': f"TEST{datetime.now().strftime('%y%m%d%H%M%S')}",
                'station_id': 'HQ4',
                'measurement_type': 'FFM',
                'frequency_start': 94700000,  # 94.7 MHz
                'frequency_stop': 94700000,
                'start_time': datetime.now(),
                'duration': 300,  # 5 minutes
                'priority': 5,
                'operator': 'soap_test_client'
            }
            
            if self.service:
                result = self.service.ScheduleMeasurement(
                    auth_token=self.auth_token,
                    measurement_request=measurement_request
                )
            else:
                # Manual SOAP request
                import requests
                soap_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:ScheduleMeasurement>
            <ns:auth_token>{self.auth_token}</ns:auth_token>
            <ns:measurement_request>
                <tns:measurement_id>{measurement_request['measurement_id']}</tns:measurement_id>
                <tns:station_id>{measurement_request['station_id']}</tns:station_id>
                <tns:measurement_type>{measurement_request['measurement_type']}</tns:measurement_type>
                <tns:frequency_start>{measurement_request['frequency_start']}</tns:frequency_start>
                <tns:frequency_stop>{measurement_request['frequency_stop']}</tns:frequency_stop>
                <tns:start_time>{measurement_request['start_time'].isoformat()}</tns:start_time>
                <tns:duration>{measurement_request['duration']}</tns:duration>
                <tns:priority>{measurement_request['priority']}</tns:priority>
                <tns:operator>{measurement_request['operator']}</tns:operator>
            </ns:measurement_request>
        </ns:ScheduleMeasurement>
    </soap:Body>
</soap:Envelope>"""
                
                response = requests.post(
                    self.endpoint,
                    data=soap_request,
                    headers={'Content-Type': 'application/soap+xml'}
                )
                print(f"Status: {response.status_code}")
                print(f"Response:\n{response.text[:500]}")
                return
            
            print(f"✅ Success! Measurement scheduled")
            print(f"  Order ID: {result}")
            print(f"  Station: {measurement_request['station_id']}")
            print(f"  Type: {measurement_request['measurement_type']}")
            print(f"  Frequency: {measurement_request['frequency_start']/1e6} MHz")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def test_get_operator_list(self):
        """Test GetOperatorList service"""
        print("\n" + "="*70)
        print("Testing: GetOperatorList")
        print("="*70)
        
        try:
            if self.service:
                result = self.service.GetOperatorList(auth_token=self.auth_token)
            else:
                # Manual SOAP request
                import requests
                soap_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetOperatorList>
            <ns:auth_token>{self.auth_token}</ns:auth_token>
        </ns:GetOperatorList>
    </soap:Body>
</soap:Envelope>"""
                
                response = requests.post(
                    self.endpoint,
                    data=soap_request,
                    headers={'Content-Type': 'application/soap+xml'}
                )
                print(f"Status: {response.status_code}")
                print(f"Response:\n{response.text[:500]}")
                return
            
            print(f"✅ Success! Retrieved {len(result)} operator(s)")
            for i, operator in enumerate(result, 1):
                print(f"\nOperator {i}:")
                print(f"  ID: {operator.operator_id}")
                print(f"  Username: {operator.username}")
                print(f"  Full Name: {operator.full_name}")
                print(f"  Role: {operator.role}")
                print(f"  Active: {operator.is_active}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def test_get_report_list(self):
        """Test GetReportList service"""
        print("\n" + "="*70)
        print("Testing: GetReportList")
        print("="*70)
        
        try:
            if self.service:
                result = self.service.GetReportList(
                    auth_token=self.auth_token,
                    report_type="PDF"
                )
            else:
                # Manual SOAP request
                import requests
                soap_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetReportList>
            <ns:auth_token>{self.auth_token}</ns:auth_token>
            <ns:report_type>PDF</ns:report_type>
        </ns:GetReportList>
    </soap:Body>
</soap:Envelope>"""
                
                response = requests.post(
                    self.endpoint,
                    data=soap_request,
                    headers={'Content-Type': 'application/soap+xml'}
                )
                print(f"Status: {response.status_code}")
                print(f"Response:\n{response.text[:500]}")
                return
            
            print(f"✅ Success! Retrieved {len(result)} report(s)")
            for i, report in enumerate(result, 1):
                print(f"\nReport {i}:")
                print(f"  ID: {report.report_id}")
                print(f"  Name: {report.report_name}")
                print(f"  Type: {report.report_type}")
                print(f"  Format: {report.format}")
                print(f"  Size: {report.file_size} bytes")
                print(f"  Created: {report.created_date}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def run_all_tests(self):
        """Run all SOAP service tests"""
        print("\n" + "="*70)
        print("ArgusUI SOAP Web Services Test Suite")
        print("="*70)
        
        self.test_get_system_parameters()
        self.test_get_station_status()
        self.test_schedule_measurement()
        self.test_get_operator_list()
        self.test_get_report_list()
        
        print("\n" + "="*70)
        print("Test Suite Complete")
        print("="*70)


def main():
    """Main test function"""
    print("Initializing SOAP test client...")
    
    client = ArgusSOAPClient()
    client.run_all_tests()


if __name__ == "__main__":
    main()
