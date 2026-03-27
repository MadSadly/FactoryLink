@echo off
chcp 65001 >nul
setlocal EnableExtensions

echo ============================================
echo  Factory-Link - 헬스 체크 (로컬)
echo ============================================
echo.

where powershell >nul 2>&1
if errorlevel 1 (
  echo PowerShell을 찾을 수 없습니다.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$urls = @(" ^
    "'http://localhost:8080/api/health'," ^
    "'http://localhost:3001/health'," ^
    "'http://localhost:8000/health'" ^
  ");" ^
  "$names = @('Spring /api/health','Node Chat /health','AI /health');" ^
  "for ($i=0; $i -lt $urls.Length; $i++) {" ^
    "try {" ^
      "$r = Invoke-WebRequest -Uri $urls[$i] -UseBasicParsing -TimeoutSec 5;" ^
      "Write-Host ('[OK] ' + $names[$i] + ' -> ' + $r.StatusCode + ' ' + $r.Content.Trim())" ^
    "} catch {" ^
      "Write-Host ('[FAIL] ' + $names[$i] + ' -> ' + $_.Exception.Message) -ForegroundColor Red" ^
    "}" ^
  "}"

echo.
echo [브라우저] http://localhost:5173  에서 화면이 뜨는지 확인하세요.
echo.
pause
endlocal
