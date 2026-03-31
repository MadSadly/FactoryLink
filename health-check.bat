@echo off
chcp 65001 >nul
setlocal EnableExtensions

REM 프로젝트 루트
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================
echo  Factory-Link - 헬스 체크 ^(빠른 재확인^)
echo  서버를 이미 띄운 뒤 실행하세요.
echo ============================================
echo.

REM Spring은 이미 떠 있다고 가정하고 짧게 대기 (처음 기동은 dev-start.bat 사용)
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%devops\verify-local-stack.ps1" -SpringWaitSec 25 -PollSec 2

echo.
pause
endlocal
