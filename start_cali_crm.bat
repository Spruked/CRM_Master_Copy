@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "FLAG_FILE=%ROOT%\.startup_initialized"
set "LAUNCHER=%ROOT%\start_cali_crm.bat"
set "LOGO_PNG=%ROOT%\CALI CRMLOGO.png"
if not exist "%LOGO_PNG%" set "LOGO_PNG=%ROOT%\CLAI CRMLOGO.png"
set "ICON_ICO=%ROOT%\CALI CRMLOGO.ico"
if not exist "%ICON_ICO%" set "ICON_ICO=%ROOT%\CLAI CRMLOGO.ico"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\CALI CRM.lnk"
set "RUN_KEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
set "RUN_VALUE_NAME=CALI_CRM_Autostart"

if not exist "%FLAG_FILE%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Add-Type -AssemblyName System.Drawing; " ^
    "$png='%LOGO_PNG%'; $ico='%ICON_ICO%'; " ^
    "if (Test-Path $png) { " ^
    "  $bmp=[System.Drawing.Bitmap]::FromFile($png); " ^
    "  try { " ^
    "    $icon=[System.Drawing.Icon]::FromHandle($bmp.GetHicon()); " ^
    "    $fs=New-Object System.IO.FileStream($ico,[System.IO.FileMode]::Create); " ^
    "    try { $icon.Save($fs) } finally { $fs.Close() }; " ^
    "  } finally { $bmp.Dispose() } " ^
    "}"

  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; " ^
    "$Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); " ^
    "$Shortcut.TargetPath = '%LAUNCHER%'; " ^
    "$Shortcut.WorkingDirectory = '%ROOT%'; " ^
    "$Shortcut.WindowStyle = 1; " ^
    "if (Test-Path '%ICON_ICO%') { $Shortcut.IconLocation = '%ICON_ICO%,0' }; " ^
    "$Shortcut.Description = 'Start CALI CRM'; " ^
    "$Shortcut.Save()"

  if exist "%LOGO_PNG%" (
    reg add "HKCU\Control Panel\Desktop" /v Wallpaper /t REG_SZ /d "%LOGO_PNG%" /f >nul
    RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters
  )

  reg add "%RUN_KEY%" /v "%RUN_VALUE_NAME%" /t REG_SZ /d "\"%LAUNCHER%\"" /f >nul

  > "%FLAG_FILE%" echo initialized
)

reg add "%RUN_KEY%" /v "%RUN_VALUE_NAME%" /t REG_SZ /d "\"%LAUNCHER%\"" /f >nul

start "CALI CRM Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%ROOT%\start_crm_backend_wsl.ps1"
start "CALI CRM Frontend" powershell -NoExit -ExecutionPolicy Bypass -File "%ROOT%\start_crm_frontend.ps1"

endlocal
