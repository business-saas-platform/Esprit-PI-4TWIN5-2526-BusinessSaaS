$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backEndDir = Resolve-Path (Join-Path $scriptDir "..")
$cashflowDir = Resolve-Path (Join-Path $backEndDir "ml\cashflow")
$invoiceRiskDir = Resolve-Path (Join-Path $backEndDir "ml\invoice-risk")

function Ensure-VenvAndDeps {
  param([string]$mlDir)

  $venvPython = Join-Path $mlDir ".venv\Scripts\python.exe"
  if (-not (Test-Path $venvPython)) {
    Write-Host "[ML] Creating venv in $mlDir ..."
    Set-Location $mlDir
    python -m venv .venv
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r requirements.txt
  }

  # Venv can exist in a partially configured state (for example after interrupted setup).
  # Validate core modules and self-heal by installing requirements if needed.
  & $venvPython -c "import fastapi, uvicorn" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ML] Missing python deps in $mlDir. Installing requirements..."
    Set-Location $mlDir
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r requirements.txt
  }

  return $venvPython
}

function Ensure-Model {
  param(
    [string]$mlDir,
    [string]$modelPath,
    [string]$datasetScript,
    [string]$trainScript,
    [string]$venvPython
  )

  if (-not (Test-Path $modelPath)) {
    Write-Host "[ML] Model not found in $mlDir. Generating dataset + training ..."
    Set-Location $mlDir
    & $venvPython $datasetScript
    & $venvPython $trainScript
  }
}

function Start-ModelServer {
  param(
    [string]$name,
    [string]$mlDir,
    [string]$venvPython,
    [string]$appModule,
    [int]$port
  )

  $url = "http://127.0.0.1:$port"
  Write-Host "[ML][$name] Starting server on $url ..."

  $proc = Start-Process -FilePath $venvPython -ArgumentList @(
    "-m",
    "uvicorn",
    $appModule,
    "--host",
    "127.0.0.1",
    "--port",
    "$port",
    "--app-dir",
    "$mlDir"
  ) -WorkingDirectory $mlDir -PassThru

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $health = Invoke-RestMethod -Uri "$url/health" -Method GET -TimeoutSec 2
      if ($health.ok -eq $true) {
        $ready = $true
        break
      }
    } catch {
      # server still booting
    }
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    if ($proc -and -not $proc.HasExited) {
      Stop-Process -Id $proc.Id -Force
    }
    throw "[$name] ML server failed to start on port $port."
  }

  Write-Host "[ML][$name] Server ready."
  return $proc
}

Write-Host "[ML] Cashflow directory: $cashflowDir"
Write-Host "[ML] Invoice risk directory: $invoiceRiskDir"

$cashflowPython = Ensure-VenvAndDeps -mlDir $cashflowDir
$invoiceRiskPython = Ensure-VenvAndDeps -mlDir $invoiceRiskDir

Ensure-Model -mlDir $cashflowDir -modelPath (Join-Path $cashflowDir "cashflow_model.json") -datasetScript "generate_synthetic_multitenant_dataset.py" -trainScript "train_cashflow_model.py" -venvPython $cashflowPython
Ensure-Model -mlDir $invoiceRiskDir -modelPath (Join-Path $invoiceRiskDir "invoice_risk_model.json") -datasetScript "generate_synthetic_invoice_risk_dataset.py" -trainScript "train_invoice_risk_model.py" -venvPython $invoiceRiskPython

$cashflowProc = Start-ModelServer -name "cashflow" -mlDir $cashflowDir -venvPython $cashflowPython -appModule "serve_cashflow_model:app" -port 8000
$invoiceRiskProc = Start-ModelServer -name "invoice-risk" -mlDir $invoiceRiskDir -venvPython $invoiceRiskPython -appModule "serve_invoice_risk_model:app" -port 8001

$env:ML_SERVICE_URL = "http://127.0.0.1:8000"
$env:INVOICE_RISK_ML_URL = "http://127.0.0.1:8001"

Set-Location $backEndDir
Write-Host "[API] Starting NestJS with ML_SERVICE_URL=$env:ML_SERVICE_URL and INVOICE_RISK_ML_URL=$env:INVOICE_RISK_ML_URL"

try {
  npm run start:dev
}
finally {
  if ($cashflowProc -and -not $cashflowProc.HasExited) {
    Write-Host "[ML] Stopping cashflow model server..."
    Stop-Process -Id $cashflowProc.Id -Force
  }
  if ($invoiceRiskProc -and -not $invoiceRiskProc.HasExited) {
    Write-Host "[ML] Stopping invoice-risk model server..."
    Stop-Process -Id $invoiceRiskProc.Id -Force
  }
}
