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

set "EXCEL_FILE=%~1"
if "%EXCEL_FILE%"=="" (
  echo [오류] 사용법: import-excel-to-parts.bat "엑셀경로.xlsx"
  pause
  exit /b 1
)

set "SQL_FILE=%ROOT%\db\generated\excel_import_parts.sql"

echo.
echo [1/2] SQL 생성...
python "%ROOT%\tools\import_excel_categories_to_parts.py" --file "%EXCEL_FILE%" --out "%SQL_FILE%"
if errorlevel 1 (
  echo [오류] SQL 생성 실패
  pause
  exit /b 1
)

echo.
echo [2/2] SQL 실행...

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

"%MYSQL_EXE%" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" < "%SQL_FILE%"
if errorlevel 1 (
  echo [오류] SQL 실행 실패
  pause
  exit /b 1
)

echo 완료
pause
endlocal
exit /b 0
