@echo off
title ArgusUI v0.2 - System Test
color 0E

echo ==========================================
echo     ArgusUI v0.2 - System Test Suite
echo     Comprehensive System Validation
echo ==========================================
echo.

set TEST_PASSED=0
set TEST_FAILED=0

REM Get current directory
set ARGUSUI_ROOT=%~dp0..
cd /d "%ARGUSUI_ROOT%"

echo [1/10] Testing Prerequisites...
echo.

REM Test Python
echo Testing Python installation...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VER=%%i
    echo ✓ Python %PYTHON_VER% installed
    set /a TEST_PASSED+=1
) else (
    echo ✗ Python not found or not working
    set /a TEST_FAILED+=1
)

REM Test Node.js
echo Testing Node.js installation...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('node --version') do set NODE_VER=%%i
    echo ✓ Node.js %NODE_VER% installed
    set /a TEST_PASSED+=1
) else (
    echo ✗ Node.js not found or not working
    set /a TEST_FAILED+=1
)

REM Test npm
echo Testing npm installation...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('npm --version') do set NPM_VER=%%i
    echo ✓ npm %NPM_VER% installed
    set /a TEST_PASSED+=1
) else (
    echo ✗ npm not found or not working
    set /a TEST_FAILED+=1
)

echo.
echo [2/10] Testing Directory Structure...
echo.

REM Test main directories
if exist "backend" (
    echo ✓ Backend directory exists
    set /a TEST_PASSED+=1
) else (
    echo ✗ Backend directory missing
    set /a TEST_FAILED+=1
)

if exist "frontend" (
    echo ✓ Frontend directory exists
    set /a TEST_PASSED+=1
) else (
    echo ✗ Frontend directory missing
    set /a TEST_FAILED+=1
)

if exist "C:\ArgusUI\data" (
    echo ✓ Data directory exists (C:\ArgusUI\data)
    set /a TEST_PASSED+=1
) else (
    echo ✗ Data directory missing (C:\ArgusUI\data)
    set /a TEST_FAILED+=1
)

echo.
echo [3/10] Testing Backend Environment...
echo.

cd backend

REM Test virtual environment
if exist "venv\Scripts\activate.bat" (
    echo ✓ Python virtual environment exists
    set /a TEST_PASSED+=1
    
    REM Test package installation
    echo Testing Python packages...
    call venv\Scripts\activate.bat
    
    python -c "import fastapi; print('✓ FastAPI installed:', fastapi.__version__)" 2>nul
    if %errorlevel% equ 0 (
        set /a TEST_PASSED+=1
    ) else (
        echo ✗ FastAPI not installed or not working
        set /a TEST_FAILED+=1
    )
    
    python -c "import motor; print('✓ Motor (MongoDB) installed')" 2>nul
    if %errorlevel% equ 0 (
        set /a TEST_PASSED+=1
    ) else (
        echo ✗ Motor (MongoDB driver) not installed
        set /a TEST_FAILED+=1
    )
    
    python -c "import jose; print('✓ Python-JOSE installed')" 2>nul
    if %errorlevel% equ 0 (
        set /a TEST_PASSED+=1
    ) else (
        echo ✗ Python-JOSE not installed
        set /a TEST_FAILED+=1
    )
    
) else (
    echo ✗ Python virtual environment missing
    set /a TEST_FAILED+=1
)

REM Test configuration file
if exist ".env" (
    echo ✓ Backend configuration file exists
    set /a TEST_PASSED+=1
) else (
    echo ✗ Backend .env file missing
    set /a TEST_FAILED+=1
)

echo.
echo [4/10] Testing Frontend Environment...
echo.

cd ..\frontend

REM Test node_modules
if exist "node_modules" (
    echo ✓ Node modules installed
    set /a TEST_PASSED+=1
) else (
    echo ✗ Node modules missing (run: npm install --legacy-peer-deps)
    set /a TEST_FAILED+=1
)

REM Test package.json
if exist "package.json" (
    echo ✓ Package.json exists
    set /a TEST_PASSED+=1
) else (
    echo ✗ Package.json missing
    set /a TEST_FAILED+=1
)

REM Test frontend configuration
if exist ".env" (
    echo ✓ Frontend configuration file exists
    set /a TEST_PASSED+=1
) else (
    echo ✗ Frontend .env file missing
    set /a TEST_FAILED+=1
)

echo.
echo [5/10] Testing MongoDB Connection...
echo.

REM Test MongoDB service
sc query "MongoDB" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MongoDB service found
    
    REM Try to start MongoDB
    net start MongoDB >nul 2>&1
    
    REM Test MongoDB connection
    timeout /t 2 /nobreak >nul
    
    REM Use Python to test MongoDB connection
    cd ..\backend
    call venv\Scripts\activate.bat
    python -c "import pymongo; client = pymongo.MongoClient('mongodb://localhost:27017/'); client.server_info(); print('✓ MongoDB connection successful')" 2>nul
    if %errorlevel% equ 0 (
        echo ✓ MongoDB connection test passed
        set /a TEST_PASSED+=1
    ) else (
        echo ✗ MongoDB connection failed
        set /a TEST_FAILED+=1
    )
    
    set /a TEST_PASSED+=1
) else (
    echo ✗ MongoDB service not found
    echo   Install MongoDB Community Server as Windows service
    set /a TEST_FAILED+=1
)

echo.
echo [6/10] Testing Network Configuration...
echo.

REM Test firewall rules
netsh advfirewall firewall show rule name="ArgusUI-Frontend" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend firewall rule configured
    set /a TEST_PASSED+=1
) else (
    echo ✗ Frontend firewall rule missing
    set /a TEST_FAILED+=1
)

netsh advfirewall firewall show rule name="ArgusUI-Backend" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend firewall rule configured
    set /a TEST_PASSED+=1
) else (
    echo ✗ Backend firewall rule missing
    set /a TEST_FAILED+=1
)

REM Test port availability
netstat -an | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠ Port 3000 in use (may be ArgusUI frontend)
) else (
    echo ✓ Port 3000 available
    set /a TEST_PASSED+=1
)

netstat -an | findstr ":8001" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠ Port 8001 in use (may be ArgusUI backend)
) else (
    echo ✓ Port 8001 available
    set /a TEST_PASSED+=1
)

echo.
echo [7/10] Testing Backend Startup...
echo.

cd ..\backend
call venv\Scripts\activate.bat

echo Starting backend test server for 10 seconds...
start /B timeout 10 >nul && taskkill /F /IM python.exe >nul 2>&1
start /B uvicorn server:app --host 127.0.0.1 --port 8002 >nul 2>&1

REM Wait for server to start
timeout /t 5 /nobreak >nul

REM Test health endpoint
curl -s http://127.0.0.1:8002/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend server test successful
    set /a TEST_PASSED+=1
) else (
    echo ✗ Backend server test failed
    set /a TEST_FAILED+=1
)

REM Stop test server
taskkill /F /IM python.exe >nul 2>&1

echo.
echo [8/10] Testing Frontend Build...
echo.

cd ..\frontend

echo Testing frontend build process...
npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend build test successful
    set /a TEST_PASSED+=1
    
    if exist "build\index.html" (
        echo ✓ Build output generated
        set /a TEST_PASSED+=1
    ) else (
        echo ✗ Build output missing
        set /a TEST_FAILED+=1
    )
) else (
    echo ✗ Frontend build test failed
    set /a TEST_FAILED+=1
)

echo.
echo [9/10] Testing Argus Integration...
echo.

cd ..

REM Check Argus paths from configuration
if exist "backend\.env" (
    for /f "tokens=2 delims==" %%i in ('findstr "ARGUS_INBOX_PATH" backend\.env 2^>nul') do set ARGUS_INBOX=%%i
    for /f "tokens=2 delims==" %%i in ('findstr "ARGUS_OUTBOX_PATH" backend\.env 2^>nul') do set ARGUS_OUTBOX=%%i
    
    if defined ARGUS_INBOX (
        if exist "%ARGUS_INBOX%" (
            echo ✓ Argus INBOX directory accessible: %ARGUS_INBOX%
            set /a TEST_PASSED+=1
        ) else (
            echo ⚠ Argus INBOX directory not found: %ARGUS_INBOX%
            echo   (This is normal if Argus is not installed on this server)
        )
    )
    
    if defined ARGUS_OUTBOX (
        if exist "%ARGUS_OUTBOX%" (
            echo ✓ Argus OUTBOX directory accessible: %ARGUS_OUTBOX%
            set /a TEST_PASSED+=1
        ) else (
            echo ⚠ Argus OUTBOX directory not found: %ARGUS_OUTBOX%
            echo   (This is normal if Argus is not installed on this server)
        )
    )
) else (
    echo ⚠ Backend configuration not found, skipping Argus path test
)

echo.
echo [10/10] Generating Test Report...
echo.

set /a TOTAL_TESTS=%TEST_PASSED%+%TEST_FAILED%
set /a SUCCESS_RATE=(%TEST_PASSED%*100)/%TOTAL_TESTS%

echo ==========================================
echo        ArgusUI v0.2 - Test Results
echo ==========================================
echo.
echo 📊 TEST SUMMARY:
echo    Total Tests: %TOTAL_TESTS%
echo    Passed: %TEST_PASSED%
echo    Failed: %TEST_FAILED%
echo    Success Rate: %SUCCESS_RATE%%%
echo.

if %TEST_FAILED% equ 0 (
    echo 🎉 ALL TESTS PASSED!
    echo    ArgusUI v0.2 is ready to run!
    echo    
    echo    Next steps:
    echo    1. Run: run-argusui.bat
    echo    2. Access: http://localhost:3000
    echo    3. Login: admin / admin123
    color 0A
) else (
    if %SUCCESS_RATE% gtr 70 (
        echo ⚠️  MOSTLY READY - Some issues detected
        echo    ArgusUI may work but some features might not function properly.
        echo    Review the failed tests above and fix issues before running.
        color 0E
    ) else (
        echo ❌ SETUP INCOMPLETE - Multiple issues detected
        echo    Please run setup-argusui.bat and fix the failed tests.
        echo    ArgusUI will not work properly with this configuration.
        color 0C
    )
)

echo.
echo 🔧 TROUBLESHOOTING:
if %TEST_FAILED% gtr 0 (
    echo    - Run setup-argusui.bat to fix missing components
    echo    - Check Windows Firewall settings
    echo    - Ensure MongoDB is installed as Windows service
    echo    - Update Argus paths in backend\.env if Argus is installed
    echo    - Check network connectivity for dependencies
)
echo.
echo ==========================================

REM Create test report file
(
    echo ArgusUI v0.2 System Test Report
    echo Generated: %date% %time%
    echo.
    echo Test Results:
    echo Total Tests: %TOTAL_TESTS%
    echo Passed: %TEST_PASSED%
    echo Failed: %TEST_FAILED%
    echo Success Rate: %SUCCESS_RATE%%%
    echo.
    echo System Information:
    systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Type"
    echo.
    echo Network Configuration:
    ipconfig | findstr "IPv4"
) > "test-report-%date:~-4,4%%date:~-10,2%%date:~-7,2%.txt"

echo Test report saved to: test-report-%date:~-4,4%%date:~-10,2%%date:~-7,2%.txt
echo.

pause
