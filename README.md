# Factory-Link B2B Platform (초기 골격)

## Quick Start

1. `cp devops/.env.example devops/.env` (Windows: `Copy-Item devops\.env.example devops\.env`)
2. `cp client/.env.example client/.env`
3. 필수 값 채우기: `DB_PASS`, `JWT_SECRET`(32바이트 이상), `OPENAI_API_KEY`, `VITE_KAKAO_MAP_KEY`(지도 사용 시)
4. 전체 스택 기동: `make build` 또는  
   `docker compose --env-file devops/.env -f devops/docker-compose.yml up --build`

### Getting API Keys

- **Kakao Map (JavaScript 키):** [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 키 → JavaScript 키 → 플랫폼 Web에 `http://localhost:5173` 등록
- **OpenAI:** [API keys](https://platform.openai.com/api-keys)
- **JWT Secret (로컬 생성 예시):**  
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 연결 진단 (개발용)

- 브라우저에서 `http://localhost:5173/dev/connection-test` — Spring / Node / AI / Socket.io 상태 확인

---

Factory-Link는 제조사 간 부품 거래를 위한 B2B 플랫폼 초기 구조입니다.
5일 내 MVP 구축을 목표로 `Spring + Node + Python AI + React` 멀티 서비스 구조로 설계했습니다.

## 0. 개인 프로젝트 기준 — “개발 환경 초기 설정”이 끝났다고 볼 수 있는 기준

아래를 **체크한 뒤** 본격 기능 개발에 들어가면 됩니다. (팀/운영용이 아니라 **본인만 쓰는** 기준입니다.)

| 단계 | 내용 | 완료 여부 |
|------|------|-----------|
| 1 | 코드 클론 또는 폴더 준비 | |
| 2 | `client`, `server-node`, `server-ai`에서 `npm install` / `pip install` (로컬 실행 시) | |
| 3 | `devops/.env.example` → `devops/.env` 복사 후 필요 시 비밀번호·API 키만 수정 | |
| 4 | `client/.env.example` → `client/.env` 복사 (로컬에서 `npm run dev` 할 때) | |
| 5 | Docker로 전체 기동: 아래 `docker compose` 명령으로 5173·8080·3001·8000·3306 응답 확인 | |
| 6 | (선택) Git 원격 `origin` 연결 후 첫 커밋/푸시 | |
| 7 | (선택) GitHub Actions가 PR/푸시 시 빌드만 통과하는지 확인 | |

**아직 “배포 파이프라인 완성”은 아닙니다.**  
지금 GitHub Actions는 주로 **빌드 검증 + Docker 이미지 빌드**까지이고, 클라우드에 자동 배포하는 단계는 비워 둔 상태입니다. 개인 프로젝트면 **나중에 EC2 한 대 + 같은 compose**로 붙여도 됩니다.

### 0.1 지금 당장 할 일 (추천 순서)

1. **기능 개발**부터: 화면/API/DB 중 하나를 정해서 “끝까지 한 줄” 만들기 (예: 부품 목록 조회).
2. **로컬에서만** Docker 또는 `npm`/`mvn`으로 실행 습관 들이기.
3. 기능이 조금 쌓이면 **스테이징 배포** (한 VM 또는 PaaS)로 옮기기.
4. 그때 **Secrets + 자동 배포**를 GitHub Actions에 추가.

---

## 0.2 초보자용 — 지금 레포는 어떻게 구성되어 있나요?

### 저장소 구조

- **`client`**: 브라우저에서 보는 화면 (React). `VITE_*` 환경 변수로 API 주소를 지정합니다.
- **`server-spring`**: 주문·부품·계약 같은 **비즈니스 API** (Java). MariaDB와 연결합니다.
- **`server-node`**: **실시간 채팅**만 담당 (Socket.io). 부하를 나누기 위해 분리했습니다.
- **`server-ai`**: **ML 분석·계약서 초안** (Python). OpenAI 키가 없으면 템플릿 응답만 씁니다.
- **`devops`**: Docker Compose로 위 서비스를 한 번에 띄우는 설정.
- **`.github/workflows`**: 푸시 시 빌드가 깨지지 않는지 확인하는 CI.

### 환경 변수는 왜 두 군데인가요?

- **`devops/.env`**: Docker Compose가 **컨테이너**에 넘기는 값 (DB 비밀번호, Spring DB URL, OpenAI 키 등).  
  예시는 `devops/.env.example` — 복사해서 `.env`로 쓰고, **`.env`는 Git에 올리지 않습니다** (`.gitignore` 처리됨).
- **`client/.env`**: 브라우저에서 실행되는 Vite가 읽는 값 (`VITE_API_BASE_URL` 등).  
  예시는 `client/.env.example`.

Docker로만 쓸 때는 `client` 컨테이너가 기본값으로 동작하도록 되어 있어도 되고, 로컬에서 `npm run dev` 할 때는 `client/.env`가 필요합니다.

### Docker Compose 실행 (개인 로컬)

```bash
copy devops\.env.example devops\.env
docker compose --env-file devops/.env -f devops/docker-compose.yml up --build
```

Windows PowerShell에서는 `copy` 대신 `Copy-Item`을 써도 됩니다.

### 0.3 로컬에서 React와 Spring만 연결하기 (백엔드 연동)

이미 코드에 반영해 두었습니다.

- **Vite 프록시**: `client/vite.config.js`에서 `http://localhost:5173/api/*` → `http://localhost:8080/api/*` 로 전달합니다.  
  그래서 `npm run dev` 시에는 `client/src/api/client.js`가 기본으로 **`/api`** 를 쓰고, 브라우저는 CORS 없이 같은 출처(`5173`)만 호출합니다.
- **CORS**: 프록시로 직접 `8080`을 호출할 때도 되도록, Spring에 `CorsConfig`로 `localhost:5173` 을 허용했습니다.
- **DB**: Spring Boot는 **`DB_USER` / `DB_PASS` / `JWT_SECRET`** 환경 변수가 필요합니다 (`application.yml`). MariaDB에 `factory_link` DB를 준비하세요.

**실행 순서 (예시)**

1. **터미널 A — Spring** (MariaDB + 위 환경 변수)
   - `server-spring` 폴더에서 **`.\mvnw.cmd spring-boot:run`** (Maven 전역 설치 없이 동작, 프로젝트에 Wrapper 포함)
   - Mac/Linux: `./mvnw spring-boot:run`
   - Windows에서 한 번에 띄울 때는 루트 **`dev-start.bat`** 이 기본 환경 변수를 잡아 줍니다(필요 시 `devops/.env`와 맞출 것).
2. **터미널 B — React**
   - `client` 폴더에서 `npm run dev`
3. 브라우저에서 `http://localhost:5173` → 부품 화면이 `GET /api/parts` 를 호출합니다.
4. 확인: 브라우저에서 `http://localhost:8080/api/health` 가 열리면 정상입니다.

`client/.env`에 `VITE_API_BASE_URL=http://localhost:8080/api` 를 넣으면 **프록시 대신** 브라우저가 8080에 직접 붙습니다. 이때는 위 CORS 설정이 적용됩니다.

### 0.4 Windows — 한 번에 설치 + 서버 기동 (`dev-start.bat`)

프로젝트 **루트**에 있는 **`dev-start.bat`** 을 더블클릭하거나, CMD/PowerShell에서 실행합니다.

```bat
D:\Factory-Link\dev-start.bat
```

이 스크립트는 다음을 순서대로 수행합니다.

1. **`client`**, **`server-node`**: `npm install`
2. **`server-ai`**: `pip install -r requirements.txt`
3. 새 창 4개에서 각각 기동:
   - Spring (`8080`, DB/JWT/OpenAI 등 환경 변수 상속)
   - Node 채팅 (`3001`, `DB_*` 필수)
   - AI FastAPI (`8000`, `OPENAI_API_KEY` 필수)
   - Vite 클라이언트 (`5173`)

**주의:** 이미 **8080·3001·8000·5173** 을 쓰는 프로그램이 있으면 실패합니다. 이전에 띄운 서버 창을 닫거나, `taskkill` 등으로 포트를 비우세요.

### 0.5 연결·동작 확인 방법 (`health-check.bat` + 브라우저)

1. **`dev-start.bat`으로 서버를 모두 띄운 뒤**, Spring이 완전히 뜰 때까지 **10~30초** 정도 기다립니다. (첫 실행 시 Maven 다운로드로 더 걸릴 수 있음)
2. 루트의 **`health-check.bat`** 를 실행합니다.  
   - Spring / Node / AI 의 **HTTP 헬스 URL**에 요청을 보내고, `[OK]` / `[FAIL]` 로 표시합니다.
3. **브라우저**에서 확인합니다.
   - `http://localhost:5173` — 메인 화면, **부품** 탭에서 목록이 보이면 프론트 → Spring API 연동이 된 것입니다.
   - `http://localhost:8080/api/health` — JSON으로 `status` 가 나오면 Spring 정상.
   - **채팅** 탭에서 메시지 전송이 되면 Node + Socket.io 정상.
4. AI는 OpenAI 키 없이도 `GET /health` 는 동작합니다. 계약 분석 API는 `server-ai` 로그를 보면서 호출하면 됩니다.

**정상 동작 요약**

| 확인 항목 | 주소 | 기대 |
|-----------|------|------|
| Spring | `http://localhost:8080/api/health` | JSON `status: ok` |
| 채팅 서버 | `http://localhost:3001/health` | JSON `status: ok` |
| AI | `http://localhost:8000/health` | JSON `status: ok` |
| 화면 + API | `http://localhost:5173` → 부품 목록 | 샘플 부품 데이터 표시 |

---

## 1. 프로젝트 구조

- `client`: React(Vite) + Tailwind CSS + Axios + Router + Socket.io Client
- `server-spring`: Spring Boot(Java 17) + MariaDB + MyBatis (핵심 비즈니스 API)
- `server-node`: Node.js(Express + Socket.io) (1:1 실시간 채팅)
- `server-ai`: FastAPI + Scikit-learn + OpenAI API (부품 분석 / 계약서 생성)
- `devops`: Docker Compose 및 운영 관련 배포 구성
- `.github/workflows/deploy.yml`: GitHub Actions CI/CD 파이프라인

## 2. 통합 실행 방법 (로컬 Docker)

환경 파일을 쓰려면 먼저 `devops/.env.example`을 `devops/.env`로 복사하세요.  
(복사 없이도 기본값으로 동작하도록 Compose에 기본값을 넣어 두었습니다.)

```bash
docker compose --env-file devops/.env -f devops/docker-compose.yml up --build
```

기본 포트:
- Client: `5173`
- Spring API: `8080`
- Chat Server: `3001`
- AI Server: `8000`
- MariaDB: `3306`

## 3. 서비스별 핵심 연동 포인트

### Client ↔ Spring
- `client/src/api/client.js`: 개발(`npm run dev`) 시 기본은 `Vite 프록시`의 `/api` → Spring `8080`
- `VITE_API_BASE_URL`을 지정하면 해당 URL로 직접 호출 (CORS는 Spring `CorsConfig`에서 허용)
- 예시 엔드포인트: `GET /api/parts`, `GET /api/health`

### Client ↔ Node Chat
- `client/src/api/socket.js`에서 `VITE_SOCKET_URL`(또는 하위 호환 `VITE_CHAT_SERVER_URL`)로 Socket 연결
- 이벤트:
  - `join-room`: 1:1 채팅방 참여
  - `chat-message`: 메시지 송수신

### Spring ↔ MariaDB
- `server-spring/src/main/resources/application.yml` 데이터소스 설정
- `server-spring/src/main/resources/schema.sql`로 초기 테이블 구성

### Spring ↔ AI (확장 포인트)
- 현재는 분리 서비스 구조만 제공
- 실서비스에서는 Spring에서 AI 서버(`server-ai`)를 REST로 호출하여
  - 부품 분석 결과 저장
  - 계약서 초안 생성/검수 워크플로우 연결

### AI 서비스 기능
- `POST /analyze/parts`: Scikit-learn 기반 텍스트 유사도 분석 예시
- `POST /contract/generate`: OpenAI API 또는 템플릿 기반 계약서 초안 생성

## 4. DB 스키마

Docker 초기화 및 로컬 참고용 스키마는 **`db/schema.sql`** (시드: **`db/seed.sql`**)과 동일 내용이 `server-spring/src/main/resources/schema.sql`에도 있습니다.

- `companies`, `users`, `parts`, `chat_rooms`, `chat_messages`, `contracts`

ERD 문서는 `docs/ERD.md`에서 확인할 수 있습니다(있는 경우).

## 5. CI/CD 개요

`deploy.yml`은 아래 순서로 동작합니다.

1. 코드 체크아웃
2. Java/Node/Python 런타임 준비
3. Spring/Node/Client/AI 빌드 검증
4. Docker Buildx 준비
5. `docker compose build`로 전체 이미지 빌드
6. 실제 클라우드 배포 단계는 Placeholder로 제공 (환경별 확장 필요)

## 6. 5일 MVP 권장 일정

- Day 1: 인증/권한/기본 도메인 API + DB 마이그레이션
- Day 2: 부품 등록/검색/매칭 로직 + 프론트 기본 화면
- Day 3: 실시간 채팅 안정화(재연결, 읽음 처리)
- Day 4: AI 계약 생성 프롬프트 고도화 + 승인 플로우
- Day 5: 통합 테스트, 모니터링, 배포 자동화 마무리

## 7. 다음 권장 작업

- Spring에 MyBatis Mapper/Service/Controller 계층 분리
- Chat 메시지 영속화(`CHAT_MESSAGE`) 연동
- AI 응답 검수(Guardrail) 및 감사 로그 테이블 추가
- GitHub Actions에 이미지 레지스트리 푸시(ECR/GHCR) 추가
