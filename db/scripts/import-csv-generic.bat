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

REM CSV encoding: default cp949 in Python. For UTF-8 Excel export use: set CSV_ENCODING=utf-8-sig (CMD) or $env:CSV_ENCODING (PS)
REM Usage: import-csv-generic.bat "CSV_FILE_PATH" [--dry-run]
set "CSV_FILE=%~1"
set "DRY_RUN=%~2"
if "%CSV_FILE%"=="" (
  echo [ERROR] Usage: import-csv-generic.bat "CSV_FILE_PATH" [--dry-run]
  pause
  exit /b 1
)

set "SQL_FILE=%ROOT%\db\generated\import_factory_csv_companies.sql"

echo.
echo [1/2] Generate SQL...
echo CSV: %CSV_FILE%
if defined CSV_ENCODING echo CSV_ENCODING: %CSV_ENCODING%
set "ENC_ARG="
if defined CSV_ENCODING set "ENC_ARG=--encoding %CSV_ENCODING%"
if /i "%DRY_RUN%"=="--dry-run" (
  python "%ROOT%\tools\import_factory_csv_to_companies.py" --file "%CSV_FILE%" %ENC_ARG% --dry-run --out-sql "%SQL_FILE%"
  echo dry-run: SQL not executed.
  pause
  exit /b 0
)

python "%ROOT%\tools\import_factory_csv_to_companies.py" --file "%CSV_FILE%" %ENC_ARG% --out-sql "%SQL_FILE%"

echo.
echo [2/2] Run SQL...

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
  echo [ERROR] mysql.exe not found. Set MYSQL_CMD in devops\.env or PATH.
  pause
  exit /b 1
)

REM mysql client must use utf8mb4 (below) or Korean may save as ?
"%MYSQL_EXE%" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" < "%SQL_FILE%"
if errorlevel 1 (
  echo [ERROR] SQL failed
  pause
  exit /b 1
)

echo Done
pause
endlocal
exit /b 0
