@echo off
REM Automatic Link Analyzer FastAPI Setup and Launch Script
REM Just double-click this file to run everything

cd /d "%~dp0"

REM Check if venv exists
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo Error: Python not found. Install Python 3.8+ and try again.
        pause
        exit /b 1
    )
)

REM Activate venv
call .venv\Scripts\activate.bat

REM Install/update requirements
echo Installing dependencies...
pip install -q -r link_analyzer/requirements.txt
if errorlevel 1 (
    echo Error installing dependencies
    pause
    exit /b 1
)

REM Run FastAPI
echo.
echo ============================================
echo Link Analyzer FastAPI Server Starting...
echo ============================================
echo.
echo Server will run on: http://127.0.0.1:8000
echo Keep this window open while using Link Analyzer
echo Close this window to stop the server
echo.
uvicorn link_analyzer.main:app --host 127.0.0.1 --port 8000 --reload

pause
