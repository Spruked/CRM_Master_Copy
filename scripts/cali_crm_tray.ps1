param(
  [switch]$Startup
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $root 'start_crm_backend_wsl.ps1'
$frontendScript = Join-Path $root 'start_crm_frontend.ps1'
$iconCandidates = @(
  (Join-Path $root 'CALI CRMLOGO.ico'),
  (Join-Path $root 'CLAI CRMLOGO.ico')
)
$logDir = Join-Path $env:LOCALAPPDATA 'CALI_CRM'
$logFile = Join-Path $logDir 'tray.log'
$crmUri = 'http://127.0.0.1:21010'

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-TrayLog([string]$Message) {
  try {
    Add-Content -LiteralPath $logFile -Value ("{0:u} {1}" -f (Get-Date), $Message) -Encoding UTF8
  } catch {}
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, 'Local\CaliCrmTraySupervisor', [ref]$createdNew)
if (-not $createdNew) {
  if (-not $Startup) {
    try { Start-Process $crmUri | Out-Null } catch {}
  }
  exit 0
}

function Test-CrmPort([int]$Port) {
  try {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1)
  } catch {
    return $false
  }
}

function Start-CrmBackend {
  if (Test-CrmPort 21000) { return }
  if (-not (Test-Path -LiteralPath $backendScript)) {
    Write-TrayLog "CRM backend launcher missing: $backendScript"
    return
  }
  Write-TrayLog 'Starting CALI CRM backend.'
  Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $backendScript)) `
    -WorkingDirectory $root `
    -WindowStyle Hidden | Out-Null
}

function Start-CrmFrontend {
  if (Test-CrmPort 21010) { return }
  if (-not (Test-Path -LiteralPath $frontendScript)) {
    Write-TrayLog "CRM frontend launcher missing: $frontendScript"
    return
  }
  Write-TrayLog 'Starting CALI CRM frontend.'
  Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $frontendScript)) `
    -WorkingDirectory $root `
    -WindowStyle Hidden | Out-Null
}

function Ensure-CrmServices {
  Start-CrmBackend
  Start-CrmFrontend
}

function Open-Crm {
  try { Start-Process $crmUri | Out-Null } catch { Write-TrayLog "Open browser failed: $($_.Exception.Message)" }
}

[System.Windows.Forms.Application]::EnableVisualStyles()
$notify = New-Object System.Windows.Forms.NotifyIcon
$iconPath = $iconCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($iconPath) {
  try { $notify.Icon = New-Object System.Drawing.Icon($iconPath) } catch { $notify.Icon = [System.Drawing.SystemIcons]::Information }
} else {
  $notify.Icon = [System.Drawing.SystemIcons]::Information
}
$notify.Text = 'CALI CRM'
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$statusItem = New-Object System.Windows.Forms.ToolStripMenuItem
$statusItem.Enabled = $false
[void]$menu.Items.Add($statusItem)

$openItem = New-Object System.Windows.Forms.ToolStripMenuItem('Open CALI CRM')
$openItem.Add_Click({ Open-Crm })
[void]$menu.Items.Add($openItem)

$ensureItem = New-Object System.Windows.Forms.ToolStripMenuItem('Ensure services running')
$ensureItem.Add_Click({ Ensure-CrmServices })
[void]$menu.Items.Add($ensureItem)

$logsItem = New-Object System.Windows.Forms.ToolStripMenuItem('Open startup log')
$logsItem.Add_Click({
  if (Test-Path -LiteralPath $logFile) { Start-Process notepad.exe -ArgumentList ('"{0}"' -f $logFile) | Out-Null }
})
[void]$menu.Items.Add($logsItem)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem('Exit tray')
$exitItem.Add_Click({
  $notify.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})
[void]$menu.Items.Add($exitItem)

$notify.ContextMenuStrip = $menu
$notify.Add_DoubleClick({ Open-Crm })

function Update-Status {
  $backendReady = Test-CrmPort 21000
  $frontendReady = Test-CrmPort 21010
  if ($backendReady -and $frontendReady) {
    $statusItem.Text = 'Status: CRM running'
    $notify.Text = 'CALI CRM - running'
  } elseif ($backendReady -or $frontendReady) {
    $statusItem.Text = 'Status: CRM partially running'
    $notify.Text = 'CALI CRM - partial'
  } else {
    $statusItem.Text = 'Status: CRM stopped'
    $notify.Text = 'CALI CRM - stopped'
  }
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({ Update-Status })

try {
  Ensure-CrmServices
  Update-Status
  $timer.Start()
  Write-TrayLog "Tray supervisor active. Startup=$Startup"
  [System.Windows.Forms.Application]::Run()
} finally {
  try { $timer.Stop(); $timer.Dispose() } catch {}
  try { $notify.Visible = $false; $notify.Dispose() } catch {}
  try { $mutex.ReleaseMutex(); $mutex.Dispose() } catch {}
}
