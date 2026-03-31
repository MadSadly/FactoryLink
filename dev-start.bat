@echo off
REM ASCII-only: UTF-8/Korean in .bat breaks cmd.exe when encoding differs.
chcp 65001 >nul
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

REM Load devops\.env via PowerShell (DB_*, JWT_*, GEMINI_*, GYEONGGI_*)
if exist "%ROOT%devops\.env" (
  echo [info] Loading devops\.env ...
  for /f "delims=" %%V in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%devops\export-env-for-cmd.ps1" -EnvFilePath "%ROOT%devops\.env"') do (
    for /f "tokens=1* delims==" %%A in ("%%V") do set "%%A=%%B"
  )
)

if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=3306"
if not defined DB_USER set "DB_USER=factorylink"
if not defined DB_PASS set "DB_PASS=factorylink123"
if not defined DB_NAME set "DB_NAME=factory_link"
if not defined JWT_SECRET set "JWT_SECRET=local-dev-jwt-secret-must-be-32-bytes-min-xx"
if not defined JWT_EXPIRATION_MS set "JWT_EXPIRATION_MS=86400000"
if not defined GEMINI_API_KEY set "GEMINI_API_KEY=gemini-local-placeholder-not-for-production-use"

REM AI server port (8000 may be blocked on Windows: Hyper-V reserved range, WinError 10013)
if not defined AI_PORT set "AI_PORT=8000"

echo ============================================
echo  Factory-Link - install deps + start servers
echo  Spring needs MariaDB database factory_link
echo  If DB error 1045: set DB_USER/DB_PASS to match MariaDB
echo ============================================
echo.

echo [1/2] npm / pip install ...
echo.

echo --- client ---
pushd "%ROOT%client"
call npm install
if errorlevel 1 (
  echo [ERROR] client npm install failed
  popd
  pause
  exit /b 1
)
popd

echo.
echo --- server-node ---
pushd "%ROOT%server-node"
call npm install
if errorlevel 1 (
  echo [ERROR] server-node npm install failed
  popd
  pause
  exit /b 1
)
popd

echo.
echo --- server-ai ---
pushd "%ROOT%server-ai"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] server-ai pip install failed - check python on PATH
  popd
  pause
  exit /b 1
)
popd

echo.
echo [2/2] Starting servers in new windows ...
echo.

start "Factory-Link Spring" cmd /k cd /d "%ROOT%server-spring" ^&^& call spring-boot-with-env.bat

timeout /t 12 /nobreak >nul

start "Factory-Link Chat" cmd /k cd /d "%ROOT%server-node" ^&^& npm run dev

REM Use 127.0.0.1 (not 0.0.0.0) to avoid WinError 10013 on some Windows setups
start "Factory-Link AI" cmd /k cd /d "%ROOT%server-ai" ^&^& python -m uvicorn app.main:app --reload --host 127.0.0.1 --port %AI_PORT%

timeout /t 2 /nobreak >nul

start "Factory-Link Client" cmd /k cd /d "%ROOT%client" ^&^& npm run dev

echo.
echo ============================================
echo  URLs
echo ============================================
echo  Spring : http://localhost:8080/api/health
echo  Chat   : http://localhost:3001/health
echo  AI     : http://localhost:8000/health
echo  Web    : http://localhost:5173
echo ============================================
echo.

echo [3/3] Health check (first Maven build may take 1-2 min) ...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%devops\verify-local-stack.ps1" -AiPort %AI_PORT%

echo.
if errorlevel 1 (
  echo [NOTE] If something failed: check MariaDB, devops\.env DB_*, and CMD window logs.
  echo        Or run health-check.bat when servers are already up.
) else (
  echo [OK] Open http://localhost:5173/companies when ready.
)
echo.
pause
endlocal
