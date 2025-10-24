@echo off
REM ================================================================
REM ArgusUI Local Update Script - Windows
REM ================================================================

echo ========================================
echo ArgusUI Update Script
echo ========================================
echo.

REM Check if running from correct directory
if not exist "backend\server.py" (
    echo ERROR: Please run this script from the ArgusUI root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Step 1: Creating backup...
if not exist "..\ArgusUIv0.2_backup\" (
    xcopy /E /I /H /Y . ..\ArgusUIv0.2_backup
    echo Backup created successfully
) else (
    echo Backup already exists, skipping...
)

echo.
echo Step 2: Stopping services...
echo Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
echo Stopping Python processes...
taskkill /F /IM python.exe 2>nul

echo.
echo Step 3: Update instructions
echo ========================================
echo Please manually update the following files:
echo.
echo Backend:
echo   - backend\xml_processor.py
echo   - backend\server.py
echo   - backend\.env (add new configuration lines)
echo.
echo Frontend:
echo   - frontend\src\components\SystemStatus.js
echo   - frontend\public\index.html
echo.
echo See UPDATE_INSTRUCTIONS.md for detailed steps
echo ========================================
echo.

echo Step 4: Add to backend\.env
echo.
echo Please open backend\.env and add these lines if not present:
echo.
echo # Argus Control Station Configuration
echo ARGUS_CONTROL_STATION=HQ4
echo ARGUS_SENDER_PC=SRVARGUS
echo.

echo ========================================
echo Update preparation complete!
echo.
echo Next steps:
echo 1. Update the files as indicated above
echo 2. Edit backend\.env to add new configuration
echo 3. Run: scripts\run-argusui-fixed.bat
echo ========================================

pause
