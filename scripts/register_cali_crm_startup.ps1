param(
  [Parameter(Mandatory = $true)][string]$Root
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
$launcher = Join-Path $root 'start_cali_crm.bat'
$trayScript = Join-Path $root 'scripts\cali_crm_tray.ps1'
$shortcutPath = Join-Path $env:USERPROFILE 'Desktop\CALI CRM.lnk'
$runRegistryPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runValueName = 'CALI_CRM_Autostart'
$pngCandidates = @(
  (Join-Path $root 'CALI CRMLOGO.png'),
  (Join-Path $root 'CLAI CRMLOGO.png')
)
$icoCandidates = @(
  (Join-Path $root 'CALI CRMLOGO.ico'),
  (Join-Path $root 'CLAI CRMLOGO.ico')
)

if (-not (Test-Path -LiteralPath $trayScript)) {
  throw "CALI CRM tray supervisor not found: $trayScript"
}

$iconPath = $icoCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $iconPath) {
  $pngPath = $pngCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($pngPath) {
    $iconPath = $icoCandidates[0]
    try {
      Add-Type -AssemblyName System.Drawing
      $bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)
      try {
        $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
        $stream = New-Object System.IO.FileStream($iconPath, [System.IO.FileMode]::Create)
        try { $icon.Save($stream) } finally { $stream.Dispose() }
      } finally {
        $bitmap.Dispose()
      }
    } catch {
      Write-Warning "Could not create CALI CRM icon: $($_.Exception.Message)"
      $iconPath = $null
    }
  }
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $root
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start CALI CRM'
if ($iconPath -and (Test-Path -LiteralPath $iconPath)) {
  $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Save()

if (-not (Test-Path $runRegistryPath)) {
  New-Item -Path $runRegistryPath -Force | Out-Null
}
$runCommand = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$trayScript`" -Startup"
Set-ItemProperty -Path $runRegistryPath -Name $runValueName -Value $runCommand

Write-Host "CALI CRM shortcut: $shortcutPath"
Write-Host "CALI CRM startup: $runCommand"
