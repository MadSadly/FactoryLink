@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0..\.."
set "ROOT=%CD%"

if exist "%ROOT%\devops\.env" (
  for /f "delims=" %%V in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\devops\export-env-for-cmd.ps1" -EnvFilePath "%ROOT%\devops\.env"') do (
    for /f "tokens=1* delims==" %%A in ("%%V") do set "%%A=%%B"
  )
)

if not defined DB_HOST set "DB_HOST=127.0.0.1"
if not defined DB_PORT set "DB_PORT=3306"
if not defined DB_USER set "DB_USER=factorylink"
if not defined DB_PASS set "DB_PASS=factorylink123"
if not defined DB_NAME set "DB_NAME=factory_link"

set "MYSQL_EXE="
if defined MYSQL_CMD if exist "%MYSQL_CMD%" set "MYSQL_EXE=%MYSQL_CMD%"
if not defined MYSQL_EXE (
  where mysql >nul 2>&1
  if not errorlevel 1 set "MYSQL_EXE=mysql"
)
if not defined MYSQL_EXE (
  for %%P in (
    "C:\Program Files\MariaDB 11.4\bin\mysql.exe"
    "C:\Program Files\MariaDB 10.11\bin\mysql.exe"
    "C:\Program Files\MariaDB 10.6\bin\mysql.exe"
    "C:\Program Files\MariaDB 10.5\bin\mysql.exe"
    "C:\Program Files (x86)\MariaDB 10.11\bin\mysql.exe"
    "C:\Program Files (x86)\MariaDB 10.6\bin\mysql.exe"
  ) do if exist %%~P set "MYSQL_EXE=%%~P"
)
if not defined MYSQL_EXE (
  echo [오류] mysql.exe 를 찾을 수 없습니다. PATH 또는 devops\.env 의 MYSQL_CMD 를 설정하세요.
  pause
  exit /b 1
)

echo [정보] migration: add_companies_business_number.sql
"%MYSQL_EXE%" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" < "%ROOT%\db\migrations\add_companies_business_number.sql"
if errorlevel 1 (
  echo [오류] migration 실패 ^(이미 컬럼/키가 있으면 무시 가능^)
  pause
  exit /b 1
)
echo 완료
pause
endlocal
exit /b 0
