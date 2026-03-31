# Factory-Link local stack check (MariaDB port, Spring, Chat, AI, Vite, /api/companies)
# Called at end of dev-start.bat
param(
  [int]$SpringWaitSec = 180,
  [int]$PollSec = 3,
  [int]$AiPort = 8000
)

function Test-HttpOk {
  param([string]$Uri, [string]$Label, [int]$TimeoutSec = 8)
  try {
    $r = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) {
      Write-Host ('[OK] ' + $Label + ' HTTP ' + [string]$r.StatusCode) -ForegroundColor Green
      return $true
    }
    Write-Host ('[FAIL] ' + $Label + ' HTTP ' + [string]$r.StatusCode) -ForegroundColor Red
    return $false
  }
  catch {
    Write-Host ('[FAIL] ' + $Label + ' -> ' + $_.Exception.Message) -ForegroundColor Red
    return $false
  }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Factory-Link - local stack check" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

try {
  $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
  if ($tcp.TcpTestSucceeded) {
    Write-Host '[OK] MariaDB port 3306 is open' -ForegroundColor Green
  }
  else {
    Write-Host '[WARN] Cannot connect to 127.0.0.1:3306 - start MariaDB and match devops\.env DB_*' -ForegroundColor Yellow
  }
}
catch {
  Write-Host '[WARN] Could not check MariaDB port (continuing)' -ForegroundColor Yellow
}

Write-Host ""
Write-Host ('Waiting for Spring Boot /api/health (max ' + [string]$SpringWaitSec + 's, first Maven build may take longer)...') -ForegroundColor DarkGray

$springReady = $false
try {
  $r0 = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 4
  if ($r0.StatusCode -eq 200) {
    $springReady = $true
    Write-Host '[OK] Spring /api/health already up' -ForegroundColor Green
  }
}
catch {
}

$deadline = (Get-Date).AddSeconds($SpringWaitSec)
$shown = 0
while (-not $springReady -and (Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 4
    if ($r.StatusCode -eq 200) {
      $springReady = $true
      Write-Host '[OK] Spring /api/health responded' -ForegroundColor Green
      break
    }
  }
  catch {
  }
  $shown++
  if ($shown -eq 1 -or ($shown % 5) -eq 0) {
    $left = [math]::Max(0, [int]($deadline - (Get-Date)).TotalSeconds)
    Write-Host ('  ... waiting for Spring (' + [string]$left + 's left)') -ForegroundColor DarkGray
  }
  Start-Sleep -Seconds $PollSec
}

if (-not $springReady) {
  Write-Host ('[FAIL] Spring did not respond within ' + [string]$SpringWaitSec + 's. Check the Factory-Link Spring CMD window / Maven log.') -ForegroundColor Red
  Write-Host ""
  exit 1
}

Write-Host ""
$allOk = $true

$allOk = (Test-HttpOk -Uri "http://localhost:3001/health" -Label "Node chat /health") -and $allOk
$allOk = (Test-HttpOk -Uri ("http://localhost:{0}/health" -f $AiPort) -Label "AI /health") -and $allOk
$allOk = (Test-HttpOk -Uri "http://localhost:5173/" -Label "Vite client :5173") -and $allOk
$allOk = (Test-HttpOk -Uri "http://localhost:8080/api/companies" -Label "Spring GET /api/companies") -and $allOk

Write-Host ""
if ($allOk) {
  Write-Host "============================================" -ForegroundColor Green
  Write-Host " All checks passed. Open: http://localhost:5173/companies" -ForegroundColor Green
  Write-Host "============================================" -ForegroundColor Green
  exit 0
}

Write-Host "============================================" -ForegroundColor Red
Write-Host " Some checks failed - see [FAIL] lines and each server window." -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
exit 1
