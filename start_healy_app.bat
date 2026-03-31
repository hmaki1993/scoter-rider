@echo off
echo Starting Gymnastic System 1...
cd /d "%~dp0app"

:: Start the dev server in the background
start /b npm run dev

:: Wait for 30 seconds to let the server start
echo Waiting for server to initialize (this takes ~30s)...
timeout /t 30 >nul

:: Open the browser in Chrome specifically
echo Opening http://localhost:3000 in Chrome...
start chrome http://localhost:3000

:: Keep the window open to show logs
echo.
echo Gymnastic System 1 is running! 🚀
echo Keep this window open while using the app.
pause
