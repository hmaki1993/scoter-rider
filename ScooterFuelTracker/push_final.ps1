$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\skinz\AppData\Local\Android\Sdk"
$env:Path += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools"

Set-Location "f:\MyRestoredProjects\ScooterFuelTracker"

Write-Host "--- [ELITE SYSTEM] Step 1: Cleaning Old Assets ---" -ForegroundColor Cyan
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }

Write-Host "--- [ELITE SYSTEM] Step 2: Building Production assets (Vite) ---" -ForegroundColor Cyan
npx vite build --base ./

Write-Host "--- [ELITE SYSTEM] Step 3: Syncing with Android (Capacitor) ---" -ForegroundColor Cyan
npx cap sync

Write-Host "--- [ELITE SYSTEM] Step 4: Deploying to OPPO Device ---" -ForegroundColor Cyan
$targetId = "3bb6875b"
npx cap run android --target $targetId

Write-Host "--- [ELITE SYSTEM] DEPLOYMENT COMPLETE! ✨💎🚀 ---" -ForegroundColor Green
