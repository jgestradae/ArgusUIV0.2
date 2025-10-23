@echo off
title ArgusUI v0.2 - Starting Services
color 0A

echo ========================================
echo    ArgusUI v0.2 - Spectrum Monitor
echo    Starting Internal Network Services
echo ========================================
echo.

REM Get current directory
set ARGUSUI_ROOT=%~dp0..
cd /d "%ARGUSUI_ROOT%"

REM Check if setup was completed
if not exist "backend\venv" (
    echo ERROR: ArgusUI not properly set up.
    echo Please run: setup-argusui.bat first
    echo.
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ERROR: Frontend dependencies not installed.
    echo Please run: setup-argusui.bat first
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking MongoDB service...
sc query "MongoDB" >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB service not found. Attempting to start...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo WARNING: Could not start MongoDB service.
        echo Please ensure MongoDB is installed and configured as a Windows service.
        echo.
        set /p continue="Continue without MongoDB? (y/n): "
        if /i not "%continue%"=="y" (
            pause
            exit /b 1
        )
    ) else (
        echo ✓ MongoDB started successfully
    )
) else (
    net start MongoDB >nul 2>&1
    echo ✓ MongoDB is running
)

echo.
echo [2/5] Starting ArgusUI Backend (FastAPI)...
cd /d "%ARGUSUI_ROOT%\backend"

REM Check if .env file exists
if not exist ".env" (
    echo ERROR: Backend configuration file (.env) not found.
    echo Please run setup-argusui.bat to create configuration files.
    pause
    exit /b 1
)

REM Activate virtual environment and start backend
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment activated.
    
    REM Start backend in new window
    start "ArgusUI-Backend-v0.2" cmd /k "title ArgusUI Backend v0.2 && echo ======================================== && echo   ArgusUI Backend v0.2 - API Server && echo   Listening on: http://localhost:8001 && echo   API Docs: http://localhost:8001/docs && echo   Health Check: http://localhost:8001/api/health && echo ======================================== && echo. && echo Starting FastAPI server... && echo. && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
    
    echo ✓ Backend starting in separate window...
) else (
    echo ERROR: Virtual environment not found.
    echo Please run setup-argusui.bat first.
    pause
    exit /b 1
)

REM Wait for backend to initialize
echo Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo.
echo [3/5] Starting ArgusUI Frontend (React)...
cd /d "%ARGUSUI_ROOT%\frontend"

REM Check if .env file exists
if not exist ".env" (
    echo ERROR: Frontend configuration file (.env) not found.
    echo Please run setup-argusui.bat to create configuration files.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Frontend dependencies not found. Installing...
    npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)

REM Start frontend in new window
start "ArgusUI-Frontend-v0.2" cmd /k "title ArgusUI Frontend v0.2 && echo ======================================== && echo   ArgusUI Frontend v0.2 - Web Interface && echo   Local Access: http://localhost:3000 && echo   Network Access: http://[YOUR-IP]:3000 && echo   Default Login: admin / admin123 && echo ======================================== && echo. && echo Starting React development server... && echo Note: This window will show compilation status && echo. && npm start"

echo ✓ Frontend starting in separate window...

echo.
echo [4/5] System Information...
echo.
echo Your server network information:
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
    set SERVER_IP=%%i
    set SERVER_IP=!SERVER_IP: =!
)

echo Server IP addresses:
ipconfig | findstr "IPv4"

echo.
echo [5/5] ArgusUI v0.2 Startup Complete!
echo ========================================
echo.
echo ACCESS INFORMATION:
echo.
echo 🌐 LOCAL ACCESS (same computer):
echo    http://localhost:3000
echo.
echo 🌐 NETWORK ACCESS (other computers):
echo    http://[YOUR-SERVER-IP]:3000
echo    Example: http://192.168.1.100:3000
echo.
echo 🔐 DEFAULT LOGIN:
echo    Username: admin
echo    Password: admin123
echo.
echo 🛠️  BACKEND API:
echo    Health Check: http://localhost:8001/api/health
echo    API Documentation: http://localhost:8001/docs
echo.
echo 📊 FEATURES AVAILABLE:
echo    ✓ System Status Monitoring
echo    ✓ Direct Measurements (FFM, SCAN)
echo    ✓ Automatic Mode (AMM)
echo    ✓ Data Navigator
echo    ✓ Configuration Management
echo    ✓ System Logs
echo.
echo ========================================
echo.
echo IMPORTANT NOTES:
echo.
echo 1. Both Backend and Frontend are running in separate windows
 echo 2. Keep both windows open while using ArgusUI
echo 3. Frontend may take 30-60 seconds to fully start
echo 4. If you see compilation errors, wait for them to resolve
echo 5. First browser load may be slow (React is compiling)
echo.
echo TO STOP ARGUSUI:
echo - Close both Backend and Frontend windows, OR
echo - Run: stop-argusui.bat
echo.
echo FOR TROUBLESHOOTING:
echo - Run: test-argusui.bat
echo - Check logs in the Backend/Frontend windows
echo.
echo 🚀 ArgusUI v0.2 is now running!
echo Ready for spectrum monitoring operations.
echo.

pause
