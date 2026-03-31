@echo off
chcp 65001 >nul
REM Factory-Link Spring — devops\.env 를 이 창에서 직접 로드한 뒤 기동합니다.
REM (dev-start.bat 이 부모에서 set 한 값은 start 로 뜬 자식 CMD에 안 넘어가는 경우가 있어 분리했습니다.)
cd /d "%~dp0"

set "ENVROOT=%~dp0..\"
if exist "%ENVROOT%devops\.env" (
  echo [Spring] devops\.env 로드 ^(DB/JWT/GEMINI^)...
  for /f "delims=" %%V in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%ENVROOT%devops\export-env-for-cmd.ps1" -EnvFilePath "%ENVROOT%devops\.env"') do (
    for /f "tokens=1* delims==" %%A in ("%%V") do set "%%A=%%B"
  )
) else (
  echo [Spring] 경고: %ENVROOT%devops\.env 없음 — 기본 DB 비밀번호를 씁니다.
)

if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=3306"
if not defined DB_USER set "DB_USER=factorylink"
if not defined DB_PASS set "DB_PASS=factorylink123"
if not defined DB_NAME set "DB_NAME=factory_link"
if not defined JWT_SECRET set "JWT_SECRET=local-dev-jwt-secret-must-be-32-bytes-min-xx"
if not defined JWT_EXPIRATION_MS set "JWT_EXPIRATION_MS=86400000"
if not defined GEMINI_API_KEY set "GEMINI_API_KEY=gemini-local-placeholder-not-for-production-use"

echo [Spring] DB_USER=%DB_USER%  DB_HOST=%DB_HOST%  DB_NAME=%DB_NAME%  ^(DB_PASS 는 출력 안 함^)
echo.

mvnw.cmd spring-boot:run
