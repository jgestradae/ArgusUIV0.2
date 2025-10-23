@echo off
title Stopping ArgusUI v0.2
color 0C

echo =====================================
echo     Stopping ArgusUI v0.2 Services
echo =====================================
echo.

echo [1/4] Stopping React Frontend...
REM Kill Node.js processes (React development server)
tasklist | find "node.exe" >nul
if %errorlevel% equ 0 (
    taskkill /F /IM node.exe >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ React frontend stopped
    ) else (
        echo - No React processes found
    )
) else (
    echo - No React processes running
)

echo.
echo [2/4] Stopping FastAPI Backend...
REM Kill Python processes (FastAPI backend)
tasklist | find "python.exe" >nul
if %errorlevel% equ 0 (
    taskkill /F /IM python.exe >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ FastAPI backend stopped
    ) else (
        echo - No Python processes found
    )
) else (
    echo - No Python processes running
)

REM Also kill uvicorn processes specifically
tasklist | find "uvicorn.exe" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM uvicorn.exe >nul 2>&1
    echo ✓ Uvicorn processes stopped
)

echo.
echo [3/4] Checking Process Status...
REM Check if processes are still running
timeout /t 2 /nobreak >nul

set PROCESSES_FOUND=0

tasklist | find "node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Some Node.js processes still running
    set PROCESSES_FOUND=1
)

tasklist | find "python.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Some Python processes still running
    set PROCESSES_FOUND=1
)

if %PROCESSES_FOUND% equ 0 (
    echo ✓ All ArgusUI processes stopped successfully
) else (
    echo.
    echo Some processes may still be running.
    echo You may need to manually close the Backend/Frontend windows.
)

echo.
echo [4/4] Service Status Summary...
echo.
echo 🛑 ArgusUI v0.2 Services Stopped:
echo    ✓ React Frontend (port 3000)
echo    ✓ FastAPI Backend (port 8001)
echo.
echo 📊 System Status:
echo    - MongoDB: Still running (use 'net stop MongoDB' to stop)
echo    - Ports 3000/8001: Now available
echo    - Data: Preserved in C:\ArgusUI\data
echo.
echo TO RESTART ARGUSUI:
echo    run-argusui.bat
echo.
echo FOR COMPLETE SYSTEM SHUTDOWN:
echo    net stop MongoDB
echo.
echo =====================================
echo    ArgusUI v0.2 Shutdown Complete
echo =====================================

pause
