@echo off
chcp 65001 >nul
setlocal EnableExtensions

REM 프로젝트 루트 (이 bat 파일이 있는 폴더)
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================
echo  Factory-Link - 의존성 설치 + 서버 기동
echo  (Spring은 MariaDB factory_link DB가 필요합니다. Docker: devops\docker-compose.yml 의 mariadb 만 띄우거나 전체 스택 사용)
echo ============================================
echo.

echo [1/2] npm / pip 패키지 설치 중...
echo.

echo --- client ---
pushd "%ROOT%client"
call npm install
if errorlevel 1 (
  echo [오류] client npm install 실패
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
  echo [오류] server-node npm install 실패
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
  echo [오류] server-ai pip install 실패 ^(python 경로 확인^)
  popd
  pause
  exit /b 1
)
popd

echo.
echo [2/2] 서버를 새 창에서 실행합니다. (각 창을 닫으면 해당 서버가 종료됩니다)
echo.

REM Spring (8080) - 다른 창 (^&^& 로 한 줄 명령 연결)
start "Factory-Link Spring" cmd /k cd /d "%ROOT%server-spring" ^&^& mvnw.cmd spring-boot:run

REM 기동 대기 (첫 실행 시 Maven 다운로드로 더 걸릴 수 있음)
timeout /t 12 /nobreak >nul

REM Node 채팅 (3001)
start "Factory-Link Chat" cmd /k cd /d "%ROOT%server-node" ^&^& npm run dev

REM AI (8000)
start "Factory-Link AI" cmd /k cd /d "%ROOT%server-ai" ^&^& python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

timeout /t 2 /nobreak >nul

REM Vite (5173)
start "Factory-Link Client" cmd /k cd /d "%ROOT%client" ^&^& npm run dev

echo.
echo ============================================
echo  기동 요약
echo ============================================
echo  Spring API : http://localhost:8080/api/health
echo  채팅 서버  : http://localhost:3001/health
echo  AI 서버    : http://localhost:8000/health
echo  웹 화면    : http://localhost:5173
echo.
echo  연결 확인은 health-check.bat 실행 또는 위 주소를 브라우저에서 여세요.
echo  README.md 의 "연결 확인 방법" 절을 참고하세요.
echo ============================================
echo.
pause
endlocal
