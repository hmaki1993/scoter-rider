$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\skinz\AppData\Local\Android\Sdk"
$env:Path += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools"

Write-Host "--- Step 1: Building web assets ---" -ForegroundColor Cyan
npx vite build

Write-Host "--- Step 2: Syncing with Capacitor ---" -ForegroundColor Cyan
npx cap sync

Write-Host "--- Step 3: Deploying to OPPO Mobile ---" -ForegroundColor Cyan
npx cap run android --target 3bb6875b
