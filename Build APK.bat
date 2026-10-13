@echo off
setlocal EnableExtensions
title Build APK - Birthday Reminder
cd /d "%~dp0"

rem ---------------------------------------------------------------------
rem  Double-click this file to build the APK.
rem  No arguments  -> builds the debug APK right away, then asks what next.
rem  Optional args: release | install | online | menu
rem ---------------------------------------------------------------------

set "SCRIPT=scripts\build-offline.ps1"

if not exist "%SCRIPT%" (
  echo.
  echo  Could not find "%SCRIPT%".
  echo  Make sure this file sits in the project root folder.
  echo.
  pause
  exit /b 1
)

set "MODE=%~1"
if /i "%MODE%"=="release" goto release
if /i "%MODE%"=="install" goto install
if /i "%MODE%"=="online"  goto online
if /i "%MODE%"=="publish" goto publish
if /i "%MODE%"=="menu"    goto menu
goto debug

:debug
call :head "Building DEBUG apk  [offline]"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "RC=%ERRORLEVEL%"
goto result

:release
call :head "Building RELEASE apk  [offline]"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Variant release
set "RC=%ERRORLEVEL%"
goto result

:install
call :head "Building DEBUG apk and installing to the connected phone"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Install
set "RC=%ERRORLEVEL%"
goto result

:online
call :head "Refreshing dependencies  [needs internet]"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -GoOnline
set "RC=%ERRORLEVEL%"
goto result

:publish
call :head "Publishing the newest APK to Myket"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js was not found on PATH. Install Node.js 18+ first.
  echo.
  pause
  goto ask
)
if not exist ".myket-token" (
  echo.
  echo  No ".myket-token" file found in the project root.
  echo  Create it and paste your Myket access token ("توکن صحت‌سنجی")
  echo  from the Myket developer panel, then run this again.
  echo.
  pause
  goto ask
)
node "scripts\publish-myket.mjs"
set "RC=%ERRORLEVEL%"
echo.
pause
goto ask

:result
echo.
if "%RC%"=="0" (
  echo  ============================================
  echo   DONE. Your APK is in the "APK builds" folder.
  echo  ============================================
) else (
  echo  ============================================
  echo   BUILD FAILED  [exit code %RC%]
  echo  ============================================
)
echo.

:ask
echo  What next?
echo    [1] Build RELEASE apk
echo    [2] Build DEBUG apk and install to phone
echo    [3] Build DEBUG apk again
echo    [4] Open the "APK builds" folder
echo    [5] Publish the newest APK to Myket
echo    [0] Close
echo.
set "NEXT="
set /p "NEXT=Type a number and press Enter: "
if "%NEXT%"=="1" goto release
if "%NEXT%"=="2" goto install
if "%NEXT%"=="3" goto debug
if "%NEXT%"=="4" goto openfolder
if "%NEXT%"=="5" goto publish
if "%NEXT%"=="0" goto done
if "%NEXT%"=="" goto done
goto ask

:openfolder
if not exist "APK builds" mkdir "APK builds"
start "" "APK builds"
goto ask

:menu
cls
echo  ============================================
echo    Birthday Reminder - APK builder
echo  ============================================
echo.
echo    [1] Build DEBUG apk        offline
echo    [2] Build RELEASE apk      offline
echo    [3] Build DEBUG and install to phone
echo    [4] Refresh dependencies   online
echo    [5] Open "APK builds" folder
echo    [6] Publish newest APK to Myket
echo    [0] Close
echo.
set "NEXT="
set /p "NEXT=Type a number and press Enter: "
if "%NEXT%"=="1" goto debug
if "%NEXT%"=="2" goto release
if "%NEXT%"=="3" goto install
if "%NEXT%"=="4" goto online
if "%NEXT%"=="5" goto openfolder
if "%NEXT%"=="6" goto publish
if "%NEXT%"=="0" goto done
if "%NEXT%"=="" goto done
goto menu

:head
cls
echo  ============================================
echo   %~1
echo  ============================================
echo.
exit /b 0

:done
echo.
echo  Bye.
endlocal
exit /b 0
