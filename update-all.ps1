$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\skinz\AppData\Local\Android\Sdk"
$env:Path += ";$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools"

Set-Location "f:\MyRestoredProjects\ScooterFuelTracker"

Write-Host "--- [ELITE UPDATE SYSTEM] ---" -ForegroundColor Cyan
$updateNotes = Read-Host "Enter short update notes (Arabic/English)"

# 1. Bump Version in App.tsx
$appFile = "src/App.tsx"
$appContent = Get-Content $appFile -Raw
if ($appContent -match "const CURRENT_VERSION = '(\d+\.\d+\.\d+)';") {
    $oldVersion = $matches[1]
    $vParts = $oldVersion.Split('.')
    $newVersion = "$($vParts[0]).$($vParts[1]).$([int]$vParts[2] + 1)"
    $appContent = $appContent -replace "const CURRENT_VERSION = '$oldVersion';", "const CURRENT_VERSION = '$newVersion';"
    Set-Content $appFile $appContent -Encoding UTF8
    Write-Host ">>> Version Bumped: $oldVersion -> $newVersion in App.tsx" -ForegroundColor Green
} else {
    Write-Host "!!! Error: Could not find CURRENT_VERSION in App.tsx" -ForegroundColor Red
    exit
}

# 2. Sync with public/version.json
$jsonFile = "public/version.json"
$jsonContent = Get-Content $jsonFile -Raw | ConvertFrom-Json
$jsonContent.version = $newVersion
$jsonContent.notes = "$updateNotes - v$newVersion"
$jsonContent | ConvertTo-Json -Depth 10 | Set-Content $jsonFile -Encoding UTF8
Write-Host ">>> Updated public/version.json" -ForegroundColor Green

# 3. Build Web Assets
Write-Host "--- Step 3: Building Production Assets ---" -ForegroundColor Cyan
npm run build

# 4. Capacitor Sync
Write-Host "--- Step 4: Syncing with Android ---" -ForegroundColor Cyan
npx cap sync

# 5. Build Native APK (Debug)
Write-Host "--- Step 5: Generating New APK ---" -ForegroundColor Cyan
Set-Location "android"
./gradlew assembleDebug
Set-Location ".."

# 6. Copy New APK to Public Folder
$newApk = "android/app/build/outputs/apk/debug/app-debug.apk"
if (Test-Path $newApk) {
    Copy-Item $newApk "public/app-debug.apk" -Force
    Write-Host ">>> New APK Ready in public/app-debug.apk" -ForegroundColor Green
} else {
    Write-Host "!!! Error: APK failed to generate!" -ForegroundColor Red
    exit
}

# 7. Git Push to GitHub
Write-Host "--- Step 7: Pushing to GitHub/Vercel ---" -ForegroundColor Cyan
git add .
git commit -m "Elite Update v$newVersion : $updateNotes"
git push

Write-Host "--- [SYSTEM] UPDATE COMPLETE! ALL USERS WILL RECEIVE v$newVersion ✨💎🚀 ---" -ForegroundColor Green
