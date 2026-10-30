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

echo   3. Opening Direct GitHub-to-Colab Worker Notebook in Browser...
start "" "https://colab.research.google.com/github/lophiuss/colab-ai-studio/blob/main/colab/01_text_llm_finetuner_and_worker.ipynb"

echo   4. Triggering Live Progress Watcher ^& Auto-Link (1-Line CLI also copied to clipboard)...
powershell -NoProfile -Command "try { Invoke-RestMethod -Uri 'http://localhost:3456/api/colab/start' -Method Post -ContentType 'application/json' -Body '{\"reason\":\"START_COLAB_STUDIO.bat One-Click Full-Auto Launcher\"}' | Out-Null; Write-Host '     - Full-Auto Colab sequence initiated! Press Ctrl+F9 (Run All) in Colab or let CDP run it.' -ForegroundColor Green } catch { Write-Host '     - Server warming up...' }"

echo ============================================================================
echo   Done!
echo   - Dashboard: http://localhost:3456
echo   - Direct Colab Notebook: Opened from GitHub (Press Ctrl+F9 / Run All)
echo   - Live Progress ^& Tunnel will auto-link to your dashboard automatically!
echo ============================================================================
timeout /t 4 >nul
