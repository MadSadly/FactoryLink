@echo off
chcp 65001 >nul
setlocal EnableExtensions

REM Repo root (this file: Factory-Link\db\scripts\)
cd /d "%~dp0..\.."
set "ROOT=%CD%"

REM devops\.env 의 DB_* 사용 (없으면 아래 기본값)
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

echo.
echo ============================================
echo  MariaDB: schema.sql + seed.sql ^(시드 데이터 없음, 테이블만^)
echo  %DB_HOST%:%DB_PORT% / %DB_USER% / %DB_NAME%
echo  주의: schema.sql 은 기존 테이블을 DROP 합니다.
echo  기존 DB 유지 + 컬럼만 추가: db\scripts\apply-migration-business-number.bat ^(business_number^)
echo ============================================
echo.
pause

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
  echo [오류] mysql.exe 를 찾을 수 없습니다.
  echo   - PATH 에 MariaDB\bin 을 넣은 뒤 **CMD/PowerShell 창을 완전히 닫고** 다시 열거나 Cursor 를 재시작하세요.
  echo   - 또는 devops\.env 에 MYSQL_CMD=C:\Program Files\MariaDB 10.6\bin\mysql.exe 처럼 전체 경로를 지정하세요.
  pause
  exit /b 1
)
echo [정보] mysql: %MYSQL_EXE%

"%MYSQL_EXE%" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if errorlevel 1 (
  echo [안내] DB 자동 생성에 실패했을 수 있습니다. factory_link DB가 이미 있거나 권한이 없을 수 있습니다.
)

"%MYSQL_EXE%" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" < "%ROOT%\db\schema.sql"
if errorlevel 1 (
  echo [오류] schema.sql 실패
  pause
  exit /b 1
)

"%MYSQL_EXE%" --default-character-set=utf8mb4 -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" "%DB_NAME%" < "%ROOT%\db\seed.sql"
if errorlevel 1 (
  echo [오류] seed.sql 실패
  pause
  exit /b 1
)

echo.
echo 완료: 스키마 적용됨. 업체 데이터는 API 동기화/임포트로 넣으세요.
echo 브라우저: http://localhost:8080/api/companies
echo 지도: http://localhost:5173/companies
echo.
pause
endlocal
exit /b 0
