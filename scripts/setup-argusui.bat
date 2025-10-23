@echo off
title ArgusUI v0.2 - Complete Setup
color 0A

echo ==========================================
echo     ArgusUI v0.2 - Complete Setup
echo     Spectrum Monitoring Control System
echo ==========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/8] Checking Prerequisites...
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
) else (
    echo ✓ Python found
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 16+
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✓ Node.js found
)

REM Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Git not found. Manual file management required.
    echo Download from: https://git-scm.com/download/win
) else (
    echo ✓ Git found
)

echo.
echo [2/8] Creating Directory Structure...
REM Create main directories
mkdir "C:\ArgusUI" 2>nul
mkdir "C:\ArgusUI\data" 2>nul
mkdir "C:\ArgusUI\data\xml_requests" 2>nul
mkdir "C:\ArgusUI\data\xml_responses" 2>nul
mkdir "C:\ArgusUI\data\measurement_results" 2>nul
mkdir "C:\ArgusUI\data\graphs" 2>nul
mkdir "C:\ArgusUI\data\audio" 2>nul
mkdir "C:\ArgusUI\data\registry" 2>nul
mkdir "C:\ArgusUI\data\logs" 2>nul
mkdir "C:\ArgusUI\data\auto_configs" 2>nul
mkdir "C:\ArgusUI\backups" 2>nul
mkdir "C:\ArgusUI\logs" 2>nul

echo ✓ Directory structure created

echo.
echo [3/8] Setting up Python Environment...
cd /d "%~dp0.."

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: backend directory not found. Make sure you're running from ArgusUI root.
    pause
    exit /b 1
)

cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo ✓ Python virtual environment ready

REM Activate virtual environment and install packages
echo Installing Python packages...
call venv\Scripts\activate.bat

REM Upgrade pip first
python -m pip install --upgrade pip setuptools wheel

REM Install requirements
if exist "requirements.txt" (
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo WARNING: Some packages failed to install. Trying individual installation...
        pip install fastapi uvicorn motor pymongo python-jose[cryptography] passlib[bcrypt] python-dotenv pydantic croniter requests python-multipart
    )
) else (
    echo Installing core packages...
    pip install fastapi uvicorn motor pymongo python-jose[cryptography] passlib[bcrypt] python-dotenv pydantic croniter requests python-multipart
)

echo ✓ Python packages installed

echo.
echo [4/8] Setting up Frontend Environment...
cd ..
cd frontend

REM Install npm packages
echo Installing Node.js packages...
if exist "package.json" (
    npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed. Trying cache clean...
        npm cache clean --force
        npm install --legacy-peer-deps --force
    )
) else (
    echo ERROR: package.json not found in frontend directory
    pause
    exit /b 1
)

echo ✓ Frontend packages installed

echo.
echo [5/8] Configuring MongoDB...
REM Check if MongoDB is installed
sc query "MongoDB" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MongoDB service not found.
    echo Please install MongoDB Community Server as a Windows service.
    echo Download from: https://www.mongodb.com/try/download/community
    echo.
    set /p continue="Continue without MongoDB? (y/n): "
    if /i not "%continue%"=="y" (
        pause
        exit /b 1
    )
) else (
    echo Starting MongoDB service...
    net start MongoDB >nul 2>&1
    echo ✓ MongoDB service running
)

echo.
echo [6/8] Creating Configuration Files...
cd ..

REM Create backend .env if it doesn't exist
if not exist "backend\.env" (
    echo Creating backend configuration...
    (
        echo # MongoDB Configuration
        echo MONGO_URL=mongodb://localhost:27017/argusui_production
        echo DB_NAME=argusui_production
        echo.
        echo # Server Configuration
        echo HOST=0.0.0.0
        echo PORT=8001
        echo.
        echo # Argus Integration Paths ^(UPDATE THESE^)
        echo ARGUS_INBOX_PATH=C:\Program Files\Rohde-Schwarz\Argus\INBOX
        echo ARGUS_OUTBOX_PATH=C:\Program Files\Rohde-Schwarz\Argus\OUTBOX
        echo ARGUS_DATA_PATH=C:\ArgusUI\data
        echo.
        echo # Security
        echo SECRET_KEY=argusui-internal-secret-key-2024
        echo.
        echo # CORS Settings ^(UPDATE WITH YOUR SERVER IP^)
        echo CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000
        echo.
        echo # Active Directory ^(Optional^)
        echo AD_ENABLED=false
        echo AD_SERVER=ldap://your-dc.domain.com
        echo AD_DOMAIN=your-domain.com
        echo.
        echo # Logging
        echo LOG_LEVEL=INFO
        echo DEBUG=True
        echo ENVIRONMENT=production
    ) > "backend\.env"
    echo ✓ Backend configuration created
) else (
    echo ✓ Backend configuration exists
)

REM Create frontend .env if it doesn't exist
if not exist "frontend\.env" (
    echo Creating frontend configuration...
    (
        echo # Backend API Configuration
        echo REACT_APP_BACKEND_URL=http://localhost:8001
        echo.
        echo # Development Configuration
        echo GENERATE_SOURCEMAP=false
        echo FAST_REFRESH=true
    ) > "frontend\.env"
    echo ✓ Frontend configuration created
) else (
    echo ✓ Frontend configuration exists
)

echo.
echo [7/8] Configuring Windows Firewall...
echo Adding firewall rules for ArgusUI ports...

REM Remove existing rules
netsh advfirewall firewall delete rule name="ArgusUI-Frontend" >nul 2>&1
netsh advfirewall firewall delete rule name="ArgusUI-Backend" >nul 2>&1

REM Add new rules
netsh advfirewall firewall add rule name="ArgusUI-Frontend" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="ArgusUI-Backend" dir=in action=allow protocol=TCP localport=8001 >nul 2>&1

if %errorlevel% equ 0 (
    echo ✓ Firewall rules configured
) else (
    echo WARNING: Could not configure firewall rules
)

echo.
echo [8/8] Final Setup and Testing...

REM Test backend setup
echo Testing backend setup...
cd backend
call venv\Scripts\activate.bat
python -c "import fastapi, motor, pymongo; print('✓ Backend packages OK')" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Backend test passed
) else (
    echo WARNING: Backend test failed
)

REM Test frontend setup
echo Testing frontend setup...
cd ..
cd frontend
node --version >nul 2>&1 && npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend test passed
) else (
    echo WARNING: Frontend test failed
)

cd ..

echo.
echo ==========================================
echo        ArgusUI v0.2 Setup Complete!
echo ==========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Update configuration files:
echo    - backend\.env (set your Argus paths)
echo    - frontend\.env (set your server IP)
echo.
echo 2. Start ArgusUI:
echo    run-argusui.bat
echo.
echo 3. Access ArgusUI:
echo    Local:   http://localhost:3000
echo    Network: http://[your-server-ip]:3000
echo.
echo 4. Login with:
echo    Username: admin
echo    Password: admin123
echo.
echo CONFIGURATION NOTES:
echo - Update ARGUS_INBOX_PATH in backend\.env
echo - Update ARGUS_OUTBOX_PATH in backend\.env
echo - Update CORS_ORIGINS with your server IP
echo - Your server IP for network access:

ipconfig | findstr "IPv4"

echo.
echo For troubleshooting, run: test-argusui.bat
echo.

pause
