@echo off
TITLE [ELITE] LIVE EMULATOR MODE
cd /d "f:\MyRestoredProjects\ScooterFuelTracker"

echo --- Step 1: Starting Pixel 8 Emulator ---
start "" "C:\Users\skinz\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_8

echo --- Step 2: Starting Live Development (Vite + Capacitor) ---
echo >>> App will refresh automatically on every code change!
npx cap run android --target Pixel_8 --livereload --external

pause
