$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\skinz\AppData\Local\Android\Sdk"
$env:Path += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools"

Write-Host "--- 1. Syncing USB/Emulator Bridge (ADB Reverse) ---" -ForegroundColor Cyan
# Apply reverse to all connected devices (Physical & Emulator)
$devices = adb devices | Select-String -Pattern "\tdevice$"
foreach ($device in $devices) {
    $serial = $device.ToString().Split("`t")[0].Trim()
    Write-Host "   > Hooking device: $serial" -ForegroundColor Gray
    adb -s $serial reverse tcp:3000 tcp:3000
}

Write-Host "--- 2. Starting Live Deployment ---" -ForegroundColor Cyan
# Start Vite in background (Job) so it doesn't block the run
Start-Job -Name "ViteServer" -ScriptBlock { 
    $env:Path = $using:env:Path
    Set-Location "f:\MyRestoredProjects\ScooterFuelTracker"
    npx vite --port 3000 --host 
}

# Run the app normally (it will point to localhost:3000 from config)
Write-Host ">>> Installing App... Please wait." -ForegroundColor Yellow
npx cap run android --target 3bb6875b

Write-Host "--- 3. LIVE MODE ACTIVE ---" -ForegroundColor Green
Write-Host ">>> YOU ARE NOW LIVE! Leave this window open." -ForegroundColor White
Write-Host ">>> To stop, press Ctrl+C or type 'Stop-Job ViteServer'" -ForegroundColor Gray

# Keep the terminal busy to show logs
Receive-Job -Name "ViteServer" -Wait
