# How to Update Your Local Windows Installation

## Files That Changed

### Backend Files:
1. **`backend/xml_processor.py`** - Updated XML format generation
2. **`backend/server.py`** - Added environment variable support for control station
3. **`backend/.env`** - Added new configuration variables

### Frontend Files:
1. **`frontend/src/components/SystemStatus.js`** - Changed polling interval to 60 seconds
2. **`frontend/public/index.html`** - Updated page title

---

## 🔄 Update Process (Windows)

### Step 1: Backup Your Current Installation
```batch
cd C:\ArgusUI
xcopy ArgusUIv0.2 ArgusUIv0.2_backup /E /I /H
```

### Step 2: Stop Running Services
Run your `stop-argusui.bat` script or manually:
```batch
cd C:\ArgusUI\ArgusUIv0.2
taskkill /F /IM node.exe
taskkill /F /IM python.exe
taskkill /F /IM mongod.exe
```

### Step 3: Update Files

You have two options:

#### Option A: Manual File Copy (Safest)
Download the updated files from the cloud environment and replace them on your local machine:

1. **Backend files:**
   - Replace: `C:\ArgusUI\ArgusUIv0.2\backend\xml_processor.py`
   - Replace: `C:\ArgusUI\ArgusUIv0.2\backend\server.py`
   - **DO NOT replace** `.env` completely - instead, ADD these lines:
     ```env
     # Argus Control Station Configuration
     ARGUS_CONTROL_STATION=HQ4
     ARGUS_SENDER_PC=SRVARGUS
     ```

2. **Frontend files:**
   - Replace: `C:\ArgusUI\ArgusUIv0.2\frontend\src\components\SystemStatus.js`
   - Replace: `C:\ArgusUI\ArgusUIv0.2\frontend\public\index.html`

#### Option B: Use Git (If you have a repository)
```batch
cd C:\ArgusUI\ArgusUIv0.2
git pull origin main
```

### Step 4: Update Your Backend .env File

Open `C:\ArgusUI\ArgusUIv0.2\backend\.env` in Notepad and add these lines (if not already present):

```env
# Argus Control Station Configuration
ARGUS_CONTROL_STATION=HQ4
ARGUS_SENDER_PC=SRVARGUS
```

**Your complete backend .env should look like:**
```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/argusui_production
DB_NAME=argusui_production

# Server Configuration
HOST=0.0.0.0
PORT=8001

# Argus Integration Paths
ARGUS_INBOX_PATH=C:\ProgramData\Rohde-Schwarz\ARGUS6\Inbox
ARGUS_OUTBOX_PATH=C:\ProgramData\Rohde-Schwarz\ARGUS6\Outbox
ARGUS_DATA_PATH=C:\ArgusUI\data

# Argus Control Station Configuration
ARGUS_CONTROL_STATION=HQ4
ARGUS_SENDER_PC=SRVARGUS

# Security
SECRET_KEY=argusui-internal-secret-key-2024

# Network Configuration
CORS_ORIGINS=http://localhost:3000,http://172.23.80.236:3000

# Active Directory (optional)
AD_ENABLED=false

# Logging
LOG_LEVEL=INFO
DEBUG=True
ENVIRONMENT=production
```

### Step 5: Restart Services

Run your startup script:
```batch
cd C:\ArgusUI\ArgusUIv0.2\scripts
run-argusui-fixed.bat
```

---

## ✅ Verification Steps

1. **Check Backend**: Open browser to `http://localhost:8001/docs` - should show API documentation
2. **Check Frontend**: Open browser to `http://localhost:3000` - should show login page
3. **Test Login**: Login with `admin` / `admin123`
4. **Check XML Format**: Go to System Status, then check the inbox folder for new XML files
5. **Verify Format**: XML files should start with `<XMLSchema1>` and have UPPERCASE tags

---

## 📁 Quick File Download Links

I'll prepare the individual files for you to download below.

---

## 🆘 If Something Goes Wrong

1. Stop all services
2. Restore from backup:
   ```batch
   cd C:\ArgusUI
   rmdir /s /q ArgusUIv0.2
   xcopy ArgusUIv0.2_backup ArgusUIv0.2 /E /I /H
   ```
3. Restart services with `run-argusui-fixed.bat`
