@echo off
title Colab AI Studio - Full-Auto One-Click Launcher
cd /d "%~dp0"

echo ============================================================================
echo   COLAB AI STUDIO - FULL-AUTO ONE-CLICK LAUNCHER
echo ============================================================================
echo   1. Starting Local Colab AI Studio Server (http://localhost:3456)...

:: Check if port 3456 is already listening
netstat -ano | findstr ":3456 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    start "Colab AI Studio Backend" /min cmd /c "node server/index.js"
    timeout /t 2 /nobreak >nul
) else (
    echo      - Local server is already running on port 3456.
)

echo   2. Opening Colab AI Studio Dashboard (http://localhost:3456)...
start "" "http://localhost:3456"

echo   3. Triggering Full-Auto Google Colab Browser Upload, Run All ^& Auto-Link...
powershell -NoProfile -Command "try { Invoke-RestMethod -Uri 'http://localhost:3456/api/colab/start' -Method Post -ContentType 'application/json' -Body '{\"reason\":\"START_COLAB_STUDIO.bat One-Click Full-Auto Launcher\"}' | Out-Null; Write-Host '     - Full-Auto Colab sequence initiated! Watch live progress on http://localhost:3456' -ForegroundColor Green } catch { Write-Host '     - Server warming up...' }"

echo ============================================================================
echo   Done! Your dashboard is open at http://localhost:3456
echo   Chrome will automatically upload/open your Colab notebook, run all cells,
echo   report live loading progress, and link the GPU tunnel automatically.
echo ============================================================================
timeout /t 4 >nul
