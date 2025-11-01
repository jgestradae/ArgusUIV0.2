# ArgusUI SOAP Web Services Documentation

## Overview

ArgusUI implements SOAP 1.2 Web Services for real-time interoperability with external systems such as ANE (Agencia Nacional del Espectro) and other spectrum management platforms. The services provide bidirectional communication for system monitoring, measurement scheduling, and data exchange.

## Compliance

These SOAP services comply with:
- **Requirement 4.4**: Delivery of WSDL, XSDs, and integration documentation
- **Requirement 4.5**: Real-time bidirectional interaction with external systems
- **Requirement 4.1_1**: Automatic and manual data synchronization
- **Requirement 4.1_3**: XML-based information exchange
- **ITU-R SM.1537**: Spectrum monitoring standards

## Service Endpoint

- **SOAP Endpoint**: `http://your-server:8001/soap`
- **WSDL Location**: `http://your-server:8001/wsdl` or `http://your-server:8001/wsdl/ArgusUI.wsdl`
- **Protocol**: SOAP 1.2 over HTTP
- **Namespace**: `http://argus.ui/soap`

## Authentication

### WS-Security Token Authentication

All SOAP operations require an authentication token passed as a parameter.

**Default Token**: `argus_soap_token_2025`

**Environment Variable**: Set `SOAP_API_TOKEN` in backend/.env

**Example Authentication**:
```xml
<ns:auth_token>argus_soap_token_2025</ns:auth_token>
```

**Authentication Errors**:
```xml
<soap:Fault>
    <soap:Code>
        <soap:Value>Client.AuthenticationFailed</soap:Value>
    </soap:Code>
    <soap:Reason>
        <soap:Text>Authentication failed</soap:Text>
    </soap:Reason>
</soap:Fault>
```

---

## Service Operations

### 1. GetSystemParameters

Retrieves configuration and capabilities of remote monitoring stations.

**Operation**: `GetSystemParameters`

**Request Parameters**:
- `auth_token` (string): Authentication token

**Returns**: Array of `StationInfo` objects

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetSystemParameters>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
        </ns:GetSystemParameters>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:GetSystemParametersResponse xmlns:ns="http://argus.ui/soap">
            <ns:GetSystemParametersResult>
                <tns:StationInfo>
                    <tns:station_id>HQ4</tns:station_id>
                    <tns:station_name>Headquarters Station 4</tns:station_name>
                    <tns:station_type>Fixed Monitoring Station</tns:station_type>
                    <tns:location>San Jose, Costa Rica</tns:location>
                    <tns:latitude>9.9281</tns:latitude>
                    <tns:longitude>-84.0907</tns:longitude>
                    <tns:status>online</tns:status>
                    <tns:capabilities>FFM, SCAN, DSCAN, DF</tns:capabilities>
                    <tns:last_update>2025-01-01T12:00:00</tns:last_update>
                </tns:StationInfo>
            </ns:GetSystemParametersResult>
        </ns:GetSystemParametersResponse>
    </soap:Body>
</soap:Envelope>
```

---

### 2. GetStationStatus

Reports operational status, alarms, or connection state for a specific station.

**Operation**: `GetStationStatus`

**Request Parameters**:
- `auth_token` (string): Authentication token
- `station_id` (string): Unique identifier of the station

**Returns**: `StationStatus` object

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetStationStatus>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
            <ns:station_id>HQ4</ns:station_id>
        </ns:GetStationStatus>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:GetStationStatusResponse xmlns:ns="http://argus.ui/soap">
            <ns:GetStationStatusResult>
                <tns:station_id>HQ4</tns:station_id>
                <tns:station_name>Headquarters Station 4</tns:station_name>
                <tns:is_online>true</tns:is_online>
                <tns:status>operational</tns:status>
                <tns:current_task>idle</tns:current_task>
                <tns:alarm_state>none</tns:alarm_state>
                <tns:connection_quality>95</tns:connection_quality>
                <tns:last_heartbeat>2025-01-01T12:00:00</tns:last_heartbeat>
            </ns:GetStationStatusResult>
        </ns:GetStationStatusResponse>
    </soap:Body>
</soap:Envelope>
```

---

### 3. ScheduleMeasurement

Allows external systems to schedule a measurement remotely.

**Operation**: `ScheduleMeasurement`

**Request Parameters**:
- `auth_token` (string): Authentication token
- `measurement_request` (MeasurementRequest): Measurement configuration

**Returns**: Order ID (string)

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:ScheduleMeasurement>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
            <ns:measurement_request>
                <tns:measurement_id>TEST250101120000</tns:measurement_id>
                <tns:station_id>HQ4</tns:station_id>
                <tns:measurement_type>FFM</tns:measurement_type>
                <tns:frequency_start>94700000</tns:frequency_start>
                <tns:frequency_stop>94700000</tns:frequency_stop>
                <tns:start_time>2025-01-01T12:00:00</tns:start_time>
                <tns:duration>300</tns:duration>
                <tns:priority>5</tns:priority>
                <tns:operator>external_system</tns:operator>
            </ns:measurement_request>
        </ns:ScheduleMeasurement>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body>
        <ns:ScheduleMeasurementResponse xmlns:ns="http://argus.ui/soap">
            <ns:ScheduleMeasurementResult>SOAP250101120000</ns:ScheduleMeasurementResult>
        </ns:ScheduleMeasurementResponse>
    </soap:Body>
</soap:Envelope>
```

---

### 4. RequestMeasurementResult

Retrieves results of a specific measurement task.

**Operation**: `RequestMeasurementResult`

**Request Parameters**:
- `auth_token` (string): Authentication token
- `measurement_id` (string): Unique measurement identifier

**Returns**: `MeasurementResult` object

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:RequestMeasurementResult>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
            <ns:measurement_id>SOAP250101120000</ns:measurement_id>
        </ns:RequestMeasurementResult>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:RequestMeasurementResultResponse xmlns:ns="http://argus.ui/soap">
            <ns:RequestMeasurementResultResult>
                <tns:measurement_id>SOAP250101120000</tns:measurement_id>
                <tns:station_id>HQ4</tns:station_id>
                <tns:measurement_type>FFM</tns:measurement_type>
                <tns:frequency>94700000</tns:frequency>
                <tns:level>-65.5 dBm</tns:level>
                <tns:status>completed</tns:status>
                <tns:start_time>2025-01-01T12:00:00</tns:start_time>
                <tns:end_time>2025-01-01T12:05:00</tns:end_time>
                <tns:data_points>300</tns:data_points>
                <tns:file_path>/data/measurements/SOAP250101120000.csv</tns:file_path>
            </ns:RequestMeasurementResultResult>
        </ns:RequestMeasurementResultResponse>
    </soap:Body>
</soap:Envelope>
```

---

### 5. PushMeasurementResult

Sends measurement results automatically to external systems.

**Operation**: `PushMeasurementResult`

**Request Parameters**:
- `auth_token` (string): Authentication token
- `measurement_result` (MeasurementResult): Result data to push

**Returns**: Boolean (success indicator)

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:PushMeasurementResult>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
            <ns:measurement_result>
                <tns:measurement_id>SOAP250101120000</tns:measurement_id>
                <tns:station_id>HQ4</tns:station_id>
                <tns:measurement_type>FFM</tns:measurement_type>
                <tns:frequency>94700000</tns:frequency>
                <tns:level>-65.5 dBm</tns:level>
                <tns:status>completed</tns:status>
                <tns:start_time>2025-01-01T12:00:00</tns:start_time>
                <tns:end_time>2025-01-01T12:05:00</tns:end_time>
                <tns:data_points>300</tns:data_points>
                <tns:file_path>/data/measurements/SOAP250101120000.csv</tns:file_path>
            </ns:measurement_result>
        </ns:PushMeasurementResult>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body>
        <ns:PushMeasurementResultResponse xmlns:ns="http://argus.ui/soap">
            <ns:PushMeasurementResultResult>true</ns:PushMeasurementResultResult>
        </ns:PushMeasurementResultResponse>
    </soap:Body>
</soap:Envelope>
```

---

### 6. GetOperatorList

Retrieves authorized operator data.

**Operation**: `GetOperatorList`

**Request Parameters**:
- `auth_token` (string): Authentication token

**Returns**: Array of `OperatorInfo` objects

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetOperatorList>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
        </ns:GetOperatorList>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:GetOperatorListResponse xmlns:ns="http://argus.ui/soap">
            <ns:GetOperatorListResult>
                <tns:OperatorInfo>
                    <tns:operator_id>1</tns:operator_id>
                    <tns:username>admin</tns:username>
                    <tns:full_name>System Administrator</tns:full_name>
                    <tns:email>admin@argus.ui</tns:email>
                    <tns:role>admin</tns:role>
                    <tns:is_active>true</tns:is_active>
                    <tns:last_login>2025-01-01T08:00:00</tns:last_login>
                </tns:OperatorInfo>
            </ns:GetOperatorListResult>
        </ns:GetOperatorListResponse>
    </soap:Body>
</soap:Envelope>
```

---

### 7. GetReportList

Provides metadata and download links for generated reports.

**Operation**: `GetReportList`

**Request Parameters**:
- `auth_token` (string): Authentication token
- `report_type` (string, optional): Filter by type (PDF, CSV, XML)

**Returns**: Array of `ReportInfo` objects

**XML Request Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://argus.ui/soap">
    <soap:Body>
        <ns:GetReportList>
            <ns:auth_token>argus_soap_token_2025</ns:auth_token>
            <ns:report_type>PDF</ns:report_type>
        </ns:GetReportList>
    </soap:Body>
</soap:Envelope>
```

**XML Response Example**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tns="http://argus.ui/soap/types">
    <soap:Body>
        <ns:GetReportListResponse xmlns:ns="http://argus.ui/soap">
            <ns:GetReportListResult>
                <tns:ReportInfo>
                    <tns:report_id>RPT001</tns:report_id>
                    <tns:report_name>Daily Measurement Summary</tns:report_name>
                    <tns:report_type>measurement</tns:report_type>
                    <tns:format>PDF</tns:format>
                    <tns:created_date>2025-01-01T00:00:00</tns:created_date>
                    <tns:created_by>system</tns:created_by>
                    <tns:file_size>1024000</tns:file_size>
                    <tns:download_url>/api/reports/RPT001/download</tns:download_url>
                </tns:ReportInfo>
            </ns:GetReportListResult>
        </ns:GetReportListResponse>
    </soap:Body>
</soap:Envelope>
```

---

## Client Integration Examples

### Python with Zeep

```python
from zeep import Client

# Create client
client = Client('http://your-server:8001/wsdl')
service = client.create_service(
    '{http://argus.ui/soap}ArgusSOAPService',
    'http://your-server:8001/soap'
)

# Call service
stations = service.GetSystemParameters(auth_token='argus_soap_token_2025')
for station in stations:
    print(f"Station: {station.station_name} - Status: {station.status}")
```

### Java with JAX-WS

```java
URL wsdlURL = new URL("http://your-server:8001/wsdl");
QName serviceName = new QName("http://argus.ui/soap", "ArgusSOAPService");
Service service = Service.create(wsdlURL, serviceName);

ArgusSOAPServicePortType port = service.getPort(ArgusSOAPServicePortType.class);
StationInfoArray stations = port.getSystemParameters("argus_soap_token_2025");
```

### .NET C#

```csharp
var client = new ArgusSOAPServiceClient();
var stations = await client.GetSystemParametersAsync("argus_soap_token_2025");

foreach (var station in stations) {
    Console.WriteLine($"Station: {station.station_name} - Status: {station.status}");
}
```

---

## Testing

Use the provided test client:

```bash
cd /app/backend
python soap_test_client.py
```

Or use SOAP testing tools:
- SoapUI
- Postman (with SOAP support)
- curl with XML requests

---

## Security Best Practices

1. **Use HTTPS in production** - Configure SSL/TLS certificates
2. **Rotate tokens regularly** - Update SOAP_API_TOKEN periodically
3. **IP whitelisting** - Restrict access to known external systems
4. **Rate limiting** - Implement request throttling
5. **Audit logging** - Monitor all SOAP requests and responses

---

## Troubleshooting

### Common Issues

**Issue**: WSDL not accessible
- **Solution**: Ensure backend service is running on port 8001
- **Check**: `curl http://localhost:8001/wsdl`

**Issue**: Authentication failed
- **Solution**: Verify auth_token matches SOAP_API_TOKEN in .env
- **Check**: Backend logs for authentication errors

**Issue**: Service timeout
- **Solution**: Check database connectivity and service health
- **Check**: Backend logs for errors

---

## Support

For technical support or integration assistance:
- Review backend logs: `/var/log/supervisor/backend.err.log`
- Check SOAP endpoint status: `http://your-server:8001/soap`
- Contact system administrator

---

## Version History

- **v1.0.0** (2025-01-01): Initial SOAP Web Services implementation
  - All 7 services operational
  - WS-Security token authentication
  - Auto-generated WSDL
  - Python test client included
