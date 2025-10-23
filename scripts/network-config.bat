@echo off
title ArgusUI v0.2 - Network Configuration
color 0B

echo ==========================================
echo     ArgusUI v0.2 Network Configuration
echo     Internal Network Access Setup
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

echo [1/4] Network Interface Information...
echo.
echo Your server's network configuration:
echo.
echo Network Adapters and IP Addresses:
ipconfig | findstr /C:"Ethernet" /C:"IPv4"
echo.

REM Get primary IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4" ^| findstr /v "127.0.0.1"') do (
    set SERVER_IP=%%i
    call set SERVER_IP=%%SERVER_IP: =%%
    goto :got_ip
)
:got_ip

if defined SERVER_IP (
    echo Primary Server IP: %SERVER_IP%
) else (
    echo WARNING: Could not detect primary IP address
    set SERVER_IP=192.168.1.100
    echo Using example IP: %SERVER_IP%
)

echo.
echo [2/4] Configuring Windows Firewall...
echo.

echo Removing existing ArgusUI firewall rules...
netsh advfirewall firewall delete rule name="ArgusUI-Frontend" >nul 2>&1
netsh advfirewall firewall delete rule name="ArgusUI-Backend" >nul 2>&1
netsh advfirewall firewall delete rule name="ArgusUI-MongoDB" >nul 2>&1

echo Adding new firewall rules for internal network access...

REM Add frontend rule (port 3000)
netsh advfirewall firewall add rule name="ArgusUI-Frontend" dir=in action=allow protocol=TCP localport=3000 profile=domain,private description="ArgusUI React Frontend - Internal Network Access"
if %errorlevel% equ 0 (
    echo ✓ Frontend port 3000 - Access allowed
) else (
    echo ✗ Failed to configure frontend port
)

REM Add backend rule (port 8001)
netsh advfirewall firewall add rule name="ArgusUI-Backend" dir=in action=allow protocol=TCP localport=8001 profile=domain,private description="ArgusUI FastAPI Backend - Internal Network Access"
if %errorlevel% equ 0 (
    echo ✓ Backend port 8001 - Access allowed
) else (
    echo ✗ Failed to configure backend port
)

REM Add MongoDB rule (port 27017) - for internal use only
netsh advfirewall firewall add rule name="ArgusUI-MongoDB" dir=in action=allow protocol=TCP localport=27017 profile=domain,private description="ArgusUI MongoDB - Internal Network Access"
if %errorlevel% equ 0 (
    echo ✓ MongoDB port 27017 - Access allowed (internal)
) else (
    echo ✗ Failed to configure MongoDB port
)

echo.
echo [3/4] Testing Network Configuration...
echo.

echo Testing port availability...
netstat -an | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Port 3000 is in use (ArgusUI Frontend may be running)
) else (
    echo - Port 3000 is available
)

netstat -an | findstr ":8001" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Port 8001 is in use (ArgusUI Backend may be running)
) else (
    echo - Port 8001 is available
)

netstat -an | findstr ":27017" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Port 27017 is in use (MongoDB running)
) else (
    echo - Port 27017 is available
)

echo.
echo [4/4] Configuration Summary and Instructions...
echo.
echo ==========================================
echo     Network Configuration Complete!
echo ==========================================
echo.
echo 🌐 INTERNAL NETWORK ACCESS:
echo.
echo    Server Computer: %COMPUTERNAME%
if defined SERVER_IP (
    echo    Server IP Address: %SERVER_IP%
    echo.
    echo    Access URLs for internal network users:
    echo    ┌─────────────────────────────────────────┐
    echo    │  http://%SERVER_IP%:3000               │
    echo    │  (Replace with your actual server IP)   │
    echo    └─────────────────────────────────────────┘
) else (
    echo    Server IP Address: [Check with ipconfig]
)
echo.
echo 🔧 CONFIGURATION FILES TO UPDATE:
echo.
echo    1. Backend Configuration (backend\.env):
echo       CORS_ORIGINS=http://localhost:3000,http://%SERVER_IP%:3000
echo.
echo    2. Frontend Configuration (frontend\.env):
echo       REACT_APP_BACKEND_URL=http://%SERVER_IP%:8001
echo.
echo 🖥️  CLIENT COMPUTER ACCESS:
echo.
echo    1. Ensure client computers are on the same network
echo    2. Open web browser on client computer
echo    3. Navigate to: http://%SERVER_IP%:3000
echo    4. Login with: admin / admin123
echo.
echo 🔒 SECURITY NOTES:
echo.
echo    ✓ Firewall configured for internal network only
echo    ✓ Ports 3000, 8001, 27017 opened for domain/private networks
echo    ✓ External/public network access blocked
echo    - MongoDB access limited to internal network
echo    - No external internet access required
echo.
echo 🧪 TESTING NETWORK ACCESS:
echo.
echo    From client computers, test these URLs:
echo    
if defined SERVER_IP (
    echo    Health Check: http://%SERVER_IP%:8001/api/health
    echo    Main Interface: http://%SERVER_IP%:3000
)
echo.
echo 📋 TROUBLESHOOTING:
echo.
echo    If clients cannot connect:
    echo    1. Check Windows Firewall settings
    echo    2. Verify client and server are on same network
    echo    3. Test ping %SERVER_IP% from client
    echo    4. Temporarily disable antivirus/firewall for testing
    echo    5. Check router/switch configuration
echo.
echo ==========================================

echo.
set /p update_config="Update configuration files now? (y/n): "
if /i "%update_config%"=="y" (
    echo.
    echo Updating configuration files...
    
    REM Update backend .env
    if exist "%~dp0..\backend\.env" (
        powershell -Command "(Get-Content '%~dp0..\backend\.env') -replace 'CORS_ORIGINS=.*', 'CORS_ORIGINS=http://localhost:3000,http://%SERVER_IP%:3000' | Set-Content '%~dp0..\backend\.env'"
        echo ✓ Backend CORS configuration updated
    )
    
    REM Update frontend .env  
    if exist "%~dp0..\frontend\.env" (
        powershell -Command "(Get-Content '%~dp0..\frontend\.env') -replace 'REACT_APP_BACKEND_URL=.*', 'REACT_APP_BACKEND_URL=http://%SERVER_IP%:8001' | Set-Content '%~dp0..\frontend\.env'"
        echo ✓ Frontend backend URL updated
    )
    
    echo.
    echo Configuration files updated successfully!
    echo Please restart ArgusUI for changes to take effect.
)

echo.
echo Network configuration complete!
echo Ready to start ArgusUI with: run-argusui.bat
echo.

pause
