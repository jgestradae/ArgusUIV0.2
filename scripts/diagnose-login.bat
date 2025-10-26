@echo off
REM ArgusUI Login Diagnostics Script
REM This will help identify why login is failing

echo ========================================
echo ArgusUI Login Diagnostics
echo ========================================
echo.

cd C:\ArgusUI\ArgusUIv0.2

echo [1/8] Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found
    pause
    exit /b 1
)
echo OK
echo.

echo [2/8] Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
)
echo OK
echo.

echo [3/8] Checking MongoDB...
tasklist | findstr mongod
if errorlevel 1 (
    echo WARNING: MongoDB not running
    echo Starting MongoDB...
    start mongod --dbpath C:\data\db
    timeout /t 5
) else (
    echo OK: MongoDB is running
)
echo.

echo [4/8] Checking backend dependencies...
cd backend
python -c "import watchdog" 2>nul
if errorlevel 1 (
    echo WARNING: watchdog not installed
    echo Installing watchdog...
    pip install watchdog==3.0.0
) else (
    echo OK: watchdog installed
)
cd ..
echo.

echo [5/8] Testing backend health endpoint...
curl -s http://localhost:8001/api/health
if errorlevel 1 (
    echo ERROR: Backend not responding on port 8001
    echo Please check if backend is running
) else (
    echo OK: Backend is healthy
)
echo.

echo [6/8] Testing login endpoint...
curl -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
if errorlevel 1 (
    echo ERROR: Login endpoint failed
) else (
    echo OK: Login endpoint working
)
echo.

echo [7/8] Checking frontend .env...
type frontend\.env
echo.

echo [8/8] Checking backend .env...
type backend\.env
echo.

echo ========================================
echo Diagnostics Complete
echo ========================================
echo.
echo If backend is not responding:
echo   1. Run: scripts\run-argusui-fixed.bat
echo   2. Check console for errors
echo.
echo If login fails in browser:
echo   1. Press F12 in browser
echo   2. Check Console tab for errors
echo   3. Check Network tab for failed requests
echo.

pause
