$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$wslRootRaw = & wsl -e wslpath -a ($root -replace "\\", "/")
$wslRoot = ($wslRootRaw | Select-Object -First 1).Trim()
if (-not $wslRoot) {
  throw "Unable to resolve WSL path for root: $root"
}
$wslVenv = "/home/bryan/projects/spruked.com/venv"
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root ".env.example") $envFile
}

$wslHasVenv = $false
try {
  $check = & wsl -e bash -lc "[ -x '$wslVenv/bin/python' ] && echo yes || echo no"
  $wslHasVenv = (($check | Select-Object -First 1).Trim() -eq "yes")
} catch {
  $wslHasVenv = $false
}

if ($wslHasVenv) {
  wsl -e bash -lc "cd '$wslRoot' && set -a && [ -f .env ] && source <(sed 's/\r$//' .env) && set +a && : `${CALI_CRM_PORT:=21000} && : `${PRIME_MAIL_API_URL:=http://127.0.0.1:19000/api} && : `${SPRUK_EMAIL_API_URL:=$PRIME_MAIL_API_URL} && export CALI_CRM_PORT PRIME_MAIL_API_URL SPRUK_EMAIL_API_URL && export PYTHONPATH='$wslRoot/source' && '$wslVenv/bin/python' source/cali_skg/api/cali_routes.py"
  exit $LASTEXITCODE
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
    return
  }
  $parts = $line.Split("=", 2)
  Set-Item -Path ("Env:" + $parts[0]) -Value $parts[1]
}
$caliDataRoot = [string]($env:CALI_DATA_ROOT)
if ($caliDataRoot -like "/mnt/*") {
  $normalized = $caliDataRoot -replace '^/mnt/([a-zA-Z])/', '$1:/'
  $env:CALI_DATA_ROOT = $normalized
}
$env:PYTHONPATH = Join-Path $root "source"
python (Join-Path $root "source\cali_skg\api\cali_routes.py")
