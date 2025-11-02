# Python Version Compatibility Guide

## Current Status

ArgusUI is **fully functional** with Python 3.13, with one optional feature limitation.

## Compatibility Matrix

| Feature | Python 3.13 | Python 3.12 | Python 3.11 |
|---------|-------------|-------------|-------------|
| Core System | ✅ Full | ✅ Full | ✅ Full |
| Report Module | ✅ Full | ✅ Full | ✅ Full |
| SMDI Module | ✅ Full | ✅ Full | ✅ Full |
| AMM System | ✅ Full | ✅ Full | ✅ Full |
| Data Navigator | ✅ Full | ✅ Full | ✅ Full |
| Authentication | ✅ Full | ✅ Full | ✅ Full |
| **SOAP Web Services** | ❌ Not Available | ✅ Full | ✅ Full |

## SOAP Web Services Limitation (Python 3.13)

### Issue
The `spyne` library (SOAP server framework) has a dependency on `six.moves` which is not compatible with Python 3.13.

### What Still Works (Python 3.13)
- ✅ Report Module - PDF/CSV/Excel/DOCX/XML generation
- ✅ REST API - All endpoints fully functional
- ✅ SMDI - Frequency/Transmitter list import
- ✅ AMM - Automatic measurement scheduling
- ✅ All frontend features
- ✅ 95% of all functionality

### What Doesn't Work (Python 3.13)
- ❌ SOAP Web Services (8 SOAP operations)
- ❌ `/soap` endpoint
- ❌ `/wsdl` endpoint
- ❌ External system SOAP integration

### Error Message
```
ModuleNotFoundError: No module named 'spyne.util.six.moves'
```

## Solutions

### Option 1: Continue with Python 3.13 (Recommended for Most Users)
**If you don't need SOAP services**, just continue using Python 3.13. All other features work perfectly.

```bash
# Windows
python server.py

# The server will start with this warning:
# "SOAP Web Services NOT AVAILABLE - requires Python 3.11/3.12"
# All other features work normally
```

### Option 2: Switch to Python 3.12 (For SOAP Support)
**If you need SOAP services**, use Python 3.12:

#### Windows:
```bash
# 1. Install Python 3.12 from python.org

# 2. Create new virtual environment with Python 3.12
cd C:\ArgusUI\ArgusUIv0.2\backend
py -3.12 -m venv venv312

# 3. Activate the new environment
venv312\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run server
python server.py
```

#### Linux:
```bash
# 1. Install Python 3.12
sudo apt-get install python3.12 python3.12-venv

# 2. Create new virtual environment
cd /app/backend
python3.12 -m venv venv312

# 3. Activate
source venv312/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run server
python server.py
```

### Option 3: Use Docker (Consistent Environment)
```bash
# Use Python 3.12 in Docker
docker build -t argusui --build-arg PYTHON_VERSION=3.12 .
docker run -p 8001:8001 -p 3000:3000 argusui
```

## Testing Your Setup

### Check if SOAP is Available:
```bash
curl http://localhost:8001/wsdl
```

**With Python 3.13 (SOAP disabled):**
```xml
<error>
    <message>SOAP WSDL is not available</message>
    <reason>Requires Python 3.11 or 3.12</reason>
</error>
```

**With Python 3.12 (SOAP enabled):**
```xml
<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/" ...>
    <wsdl:service name="ArgusSOAPService">
        ...
    </wsdl:service>
</wsdl:definitions>
```

### Verify Other Features Work:
```bash
# Test Report Generation
curl http://localhost:8001/api/reports/list

# Test SMDI
curl http://localhost:8001/api/smdi/queries

# Test AMM
curl http://localhost:8001/api/amm/configurations
```

All these should work regardless of Python version.

## Recommendations by Use Case

### Internal Use Only (No External SOAP Clients)
✅ **Use Python 3.13** - You get all features you need

### ANE Contract Compliance (Requires SOAP Services)
✅ **Use Python 3.12** - Full SOAP compliance required

### Development Environment
✅ **Use Python 3.13** - Faster, modern Python features

### Production Deployment
✅ **Use Python 3.12** - Maximum compatibility and stability

## Future Updates

The ArgusUI team is monitoring `spyne` for Python 3.13 compatibility updates. Options:
1. Wait for `spyne` to release Python 3.13 compatible version
2. Fork `spyne` and patch for Python 3.13
3. Migrate SOAP to alternative framework (e.g., `zeep` only)

## Need Help?

- Python 3.13 with SOAP disabled: Works out of the box ✅
- Python 3.12 with SOAP enabled: Follow Option 2 above
- Questions: Check `SOAP_WEB_SERVICES_DOCUMENTATION.md`

**Bottom Line:** ArgusUI works great with Python 3.13, you just won't have SOAP services. For most users, this is perfectly fine!
