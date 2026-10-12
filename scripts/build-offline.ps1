<#
  Offline-friendly APK builder for the "یادآور تولد" birthday reminder.

  Runs the whole pipeline (type-check -> Vite build -> Capacitor sync ->
  Gradle assemble) using caches that already live on this machine:
    * npm packages ......... node_modules (installed once with npm install)
    * Gradle distribution .. %USERPROFILE%/.gradle/wrapper/dists
    * Java/Kotlin deps ..... %USERPROFILE%/.gradle/caches and android/.gradle
    * Android SDK .......... .android-sdk/sdk (project-local)

  Usage (from the repo root):
    pwsh -File scripts/build-offline.ps1
    powershell -ExecutionPolicy Bypass -File scripts/build-offline.ps1
    .\scripts\build-offline.ps1 -Variant release
    .\scripts\build-offline.ps1 -GoOnline        # first run / refresh deps
    .\scripts\build-offline.ps1 -SkipTypecheck
    .\scripts\build-offline.ps1 -Install         # adb install to a device

  The default run is fully offline. Use -GoOnline only when a machine is not
  primed yet, or when dependencies changed and need to be fetched again.
#>
[CmdletBinding()]
param(
    [ValidateSet('debug', 'release')]
    [string]$Variant = 'debug',

    [switch]$GoOnline,
    [switch]$SkipTypecheck,
    [switch]$NoClean,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Write-Ok([string]$Text) {
    Write-Host "    $Text" -ForegroundColor Green
}

function Fail([string]$Text) {
    Write-Host ""
    Write-Host "ERROR: $Text" -ForegroundColor Red
    exit 1
}

function Resolve-JavaHome {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
    $candidates += (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'jdk-17' } | Sort-Object Name -Descending | Select-Object -ExpandProperty FullName)
    $candidates += @(
        'C:\Program Files\Java\jdk-17',
        'C:\Program Files\Android\Android Studio\jbr'
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path (Join-Path $c 'bin\java.exe'))) { return $c }
    }
    $javaCmd = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($javaCmd) {
        $home = Split-Path -Parent (Split-Path -Parent $javaCmd.Source)
        if (Test-Path (Join-Path $home 'bin\java.exe')) { return $home }
    }
    return $null
}

function Resolve-AndroidSdk {
    $candidates = @(
        (Join-Path $RepoRoot '.android-sdk\sdk'),
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path (Join-Path $c 'platforms\android-34'))) { return $c }
    }
    return $null
}

# --------------------------------------------------------------------------
# 1. Locate the toolchain
# --------------------------------------------------------------------------
$JavaHome = Resolve-JavaHome
if (-not $JavaHome) { Fail 'Could not find a JDK 17. Install Temurin 17 or set JAVA_HOME.' }
$JavaExe = Join-Path $JavaHome 'bin\java.exe'
$ErrorActionPreference = 'Continue'
$JavaVersion = (& $JavaExe -version 2>&1 | Select-Object -First 1)
$ErrorActionPreference = 'Stop'
Write-Step "Java: $JavaVersion"
Write-Host "    JAVA_HOME = $JavaHome"

$AndroidSdk = Resolve-AndroidSdk
if (-not $AndroidSdk) {
    Fail "Could not find an Android SDK with platform 34. Expected at $RepoRoot\.android-sdk\sdk - set ANDROID_HOME, or run once with -GoOnline to populate it."
}
Write-Host "    ANDROID_HOME = $AndroidSdk"

$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidSdk
$env:ANDROID_SDK_ROOT = $AndroidSdk

# Keep Gradle's SDK detection working even on a fresh checkout.
$LocalProperties = Join-Path $RepoRoot 'android\local.properties'
$SdkDirValue = $AndroidSdk.Replace('\', '\\').Replace(':', '\:')
Set-Content -Path $LocalProperties -Value ("sdk.dir=" + $SdkDirValue) -Encoding ascii

if (-not (Test-Path 'node_modules')) {
    Fail "node_modules is missing. Run 'npm install' once (needs network) before building offline."
}

$InitScript = Join-Path $RepoRoot '.apk-rebuild\init.gradle'
if (-not (Test-Path $InitScript)) {
    Fail "Missing $InitScript (the Gradle mirror used by the online fallback)."
}

# --------------------------------------------------------------------------
# 2. Web assets
# --------------------------------------------------------------------------
if (-not $SkipTypecheck) {
    Write-Step 'Type-checking'
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) { Fail 'npm run typecheck failed.' }
    Write-Ok 'Type-check passed'
}

Write-Step 'Building web assets (Vite)'
& npm run build
if ($LASTEXITCODE -ne 0) { Fail 'npm run build failed.' }
Write-Ok 'Web assets built into dist/'

Write-Step 'Syncing Capacitor -> android'
& npx cap sync android
if ($LASTEXITCODE -ne 0) { Fail 'npx cap sync android failed.' }
Write-Ok 'Android project synced'

# --------------------------------------------------------------------------
# 3. Gradle assemble
# --------------------------------------------------------------------------
$CapTask = 'assembleDebug'
if ($Variant -eq 'release') { $CapTask = 'assembleRelease' }

# The Gradle dependency cache is keyed to the repositories in init.gradle, so
# it must always be applied - offline mode then resolves purely from cache.
$GradleArgs = @('-I', $InitScript)
if ($GoOnline) {
    $GradleArgs += '--refresh-dependencies'
    Write-Step "Building $Variant APK (online fallback enabled)"
} else {
    $GradleArgs += '--offline'
    Write-Step "Building $Variant APK (offline)"
}
if (-not $NoClean) { $GradleArgs += 'clean' }
$GradleArgs += $CapTask
$GradleArgs += '--no-daemon'

Push-Location (Join-Path $RepoRoot 'android')
try {
    & .\gradlew.bat @GradleArgs
    $GradleExit = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($GradleExit -ne 0) { Fail "Gradle $CapTask failed (exit $GradleExit)." }
Write-Ok 'Gradle build succeeded'

# --------------------------------------------------------------------------
# 4. Collect the APK
# --------------------------------------------------------------------------
$ApkSource = Join-Path $RepoRoot "android\app\build\outputs\apk\$Variant"
$ApkFile = Get-ChildItem -Path $ApkSource -Filter '*.apk' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $ApkFile) { Fail "No APK found under $ApkSource" }

$Version = (Get-Content (Join-Path $RepoRoot 'package.json') -Raw | ConvertFrom-Json).version
$OutDir = Join-Path $RepoRoot 'APK builds'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutName = "yadavar-tavalod-$Version-$Variant.apk"
$OutPath = Join-Path $OutDir $OutName
Copy-Item -Force $ApkFile.FullName $OutPath

$SizeMb = [math]::Round((Get-Item $OutPath).Length / 1MB, 2)
$Sha = (Get-FileHash $OutPath -Algorithm SHA256).Hash

Write-Host ""
Write-Host 'APK ready' -ForegroundColor Green
Write-Host "    file   : $OutPath"
Write-Host "    size   : $SizeMb MB"
Write-Host "    sha256 : $Sha"

# --------------------------------------------------------------------------
# 5. Optional install
# --------------------------------------------------------------------------
if ($Install) {
    $Adb = Join-Path $AndroidSdk 'platform-tools\adb.exe'
    if (-not (Test-Path $Adb)) {
        Write-Host "    adb not found at $Adb; skipping install." -ForegroundColor Yellow
    } else {
        Write-Step 'Installing to connected device/emulator'
        & $Adb install -r $OutPath
        if ($LASTEXITCODE -ne 0) { Write-Host '    adb install failed.' -ForegroundColor Yellow }
        else { Write-Ok 'Installed' }
    }
}
