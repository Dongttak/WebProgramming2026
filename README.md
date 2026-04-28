# 잇다(ITDA)

대학생들이 팀플, 밥, 룸메, 외국인 교류 목적별로 매칭 글을 작성하고 조회할 수 있는 웹프로그래밍 기말 조별과제용 MVP입니다.

## 폴더 구조

```text
WebProgramming2026/
├── backend/
│   ├── app.py              # Flask API 서버
│   ├── requirements.txt    # Flask, pymongo, gunicorn 등
│   ├── runtime.txt         # Render Python 버전
│   ├── .env.example        # 백엔드 환경변수 예시
│   └── README.md
├── src/
│   ├── App.jsx             # React 화면과 상태 흐름
│   ├── main.jsx
│   ├── services/api.js     # API 호출 함수
│   └── styles/index.css
├── render.yaml             # Render Blueprint 예시
├── .env.example            # 프론트엔드 환경변수 예시
├── package.json
└── vite.config.js
```

## 구현된 기능

- 회원가입, 로그인, 로그아웃
- Flask 세션 쿠키와 Bearer 토큰 기반 로그인 상태 유지
- MongoDB 기반 매칭 글 CRUD
- 카테고리: 팀플, 밥, 룸메, 외국인 교류
- React Router 기반 페이지 URL
- 글 작성/수정 시 연락 수단 저장
- 룸메 게시판용 생활 패턴 체크리스트
- 데이트 카테고리는 확장 기능 후보로만 표시
- 키워드 기반 mock AI 추천 API
- 서버 실행 시 샘플 계정과 샘플 글 자동 생성

## 주요 화면 URL

- `/`: 홈
- `/login`: 로그인
- `/signup`: 회원가입
- `/boards`: 전체 게시판
- `/boards/team`: 팀플 게시판
- `/boards/meal`: 밥 매칭 게시판
- `/boards/roommate`: 룸메 게시판
- `/boards/global`: 외국인 교류 게시판
- `/posts/new`: 글 작성
- `/posts/:id`: 글 상세
- `/posts/:id/edit`: 글 수정

## 로컬 실행

### 1. MongoDB 실행

Docker Desktop을 사용한다면 앱을 먼저 실행합니다.

```bash
open -a Docker
```

처음 실행하는 경우:

```bash
docker run --name itda-mongo -p 27017:27017 -d mongo:7
```

이미 컨테이너가 있는 경우:

```bash
docker start itda-mongo
```

### 2. 백엔드 실행

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

로컬 백엔드는 기본적으로 `http://127.0.0.1:5050`에서 실행됩니다.

상태 확인:

```bash
curl http://127.0.0.1:5050/api/health
```

### 3. 프론트엔드 실행

새 터미널에서:

```bash
npm install
cp .env.example .env
npm run dev
```

브라우저에서 `http://localhost:5173`에 접속합니다.

로컬에서는 `.env`의 `VITE_API_BASE_URL`을 비워두고, `VITE_BACKEND_URL=http://127.0.0.1:5050`으로 둡니다. 그러면 Vite 개발 서버가 `/api` 요청을 Flask 서버로 프록시합니다.

빌드 확인:

```bash
npm run build
```

## 환경변수

### Frontend `.env`

로컬:

```env
VITE_API_BASE_URL=
VITE_BACKEND_URL=http://127.0.0.1:5050
```

Vercel:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

`VITE_API_BASE_URL`에는 Render 백엔드 주소만 넣고 마지막 `/`는 붙이지 않습니다.

### Backend `backend/.env`

로컬:

```env
PORT=5050
SECRET_KEY=replace-with-a-long-random-string
MONGO_URI=mongodb://localhost:27017/itda
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SEED_SAMPLE_DATA=true
FLASK_DEBUG=true
SESSION_COOKIE_SAMESITE=Lax
SESSION_COOKIE_SECURE=false
```

Render:

```env
SECRET_KEY=replace-with-a-long-random-string
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-url>/itda?retryWrites=true&w=majority
CORS_ORIGINS=https://your-vercel-project.vercel.app
SEED_SAMPLE_DATA=true
FLASK_DEBUG=false
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=true
```

비밀번호, MongoDB URI, API key 같은 비밀값은 코드에 직접 쓰지 말고 각 서비스의 Environment Variables에만 넣습니다.

## MongoDB Atlas 준비

1. MongoDB Atlas에서 새 Project와 Cluster를 만듭니다.
2. Database Access에서 DB 사용자를 만들고 비밀번호를 저장합니다.
3. Network Access에서 Render가 접속할 수 있게 허용합니다. 과제 MVP에서는 `0.0.0.0/0`으로 열면 가장 단순하지만, 실제 서비스에서는 더 좁게 제한하는 것이 좋습니다.
4. Connect 메뉴에서 Python용 connection string을 복사합니다.
5. Render 환경변수 `MONGO_URI`에 Atlas connection string을 넣습니다.

## Render 백엔드 배포

Render에서 새 Web Service를 만들 때:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`

환경변수:

- `SECRET_KEY`: 긴 랜덤 문자열
- `MONGO_URI`: MongoDB Atlas connection string
- `CORS_ORIGINS`: Vercel 프론트 URL
- `SEED_SAMPLE_DATA`: `true`
- `FLASK_DEBUG`: `false`
- `SESSION_COOKIE_SAMESITE`: `None`
- `SESSION_COOKIE_SECURE`: `true`

이 저장소에는 `render.yaml`도 포함되어 있어 Render Blueprint로 배포할 수도 있습니다. 단, `SECRET_KEY`, `MONGO_URI`, `CORS_ORIGINS`는 Render 대시보드에서 직접 입력해야 합니다.

배포 후 헬스체크:

```bash
curl https://your-render-service.onrender.com/api/health
```

응답의 `mongo`가 `connected`이면 Atlas 연결이 성공한 상태입니다.

## Vercel 프론트엔드 배포

Vercel에서 프로젝트를 import할 때:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

환경변수:

- `VITE_API_BASE_URL`: Render 백엔드 URL

예시:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

프론트와 백엔드 도메인이 달라도 동작하도록 프론트는 `VITE_API_BASE_URL`을 사용하고, 백엔드는 `CORS_ORIGINS`로 Vercel URL을 허용합니다.

## 샘플 데이터

백엔드 환경변수 `SEED_SAMPLE_DATA=true`이면 DB가 비어 있을 때 샘플 계정과 글이 생성됩니다.

```text
이메일: sample@itda.test
비밀번호: 1234
```

## 주요 API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/ai/recommend`

`GET /api/posts?category=team`처럼 카테고리 필터를 사용할 수 있습니다. 내부 저장값은 기존 데이터 호환을 위해 팀플 글을 `teamplay`로 유지하고, API에서 `team` alias를 지원합니다.

게시글 연락 수단 필드:

```json
{
  "contactType": "kakao | instagram | phone | email | openchat",
  "contactValue": "사용자가 입력한 연락처"
}
```

기존 글처럼 연락 수단 필드가 없는 데이터는 화면에서 `연락처 없음`으로 표시됩니다.

룸메 글에는 선택형 체크리스트를 함께 저장할 수 있습니다. 기존 글처럼 체크리스트가 없는 데이터는 빈 체크리스트로 처리되어 오류 없이 표시됩니다.

## 배포 후 테스트 체크리스트

1. Render `/api/health` 응답에서 `mongo: connected` 확인
2. Vercel 사이트 접속
3. 회원가입
4. 로그인 후 새로고침해도 로그인 상태 유지되는지 확인
5. 매칭 글 작성
6. 목록 조회
7. 상세 조회
8. 작성자 계정으로 수정
9. 작성자 계정으로 삭제
10. 글 작성 화면에서 AI 추천 버튼 동작 확인
11. `/boards/team`, `/boards/meal`, `/boards/roommate`, `/boards/global` 직접 접속 확인
12. 연락 수단이 상세 페이지에 표시되는지 확인
13. 브라우저 개발자 도구 Console/CORS 오류가 없는지 확인

## 자주 나는 배포 오류

- CORS 오류: Render의 `CORS_ORIGINS`에 Vercel URL이 정확히 들어갔는지 확인합니다. 마지막 `/`는 빼는 것이 좋습니다.
- 로그인 유지 안 됨: Render에서 `SESSION_COOKIE_SAMESITE=None`, `SESSION_COOKIE_SECURE=true`인지 확인합니다.
- DB 연결 실패: Atlas `MONGO_URI`, DB 사용자 비밀번호, Network Access 설정을 확인합니다.
- 프론트가 로컬 API로 요청함: Vercel 환경변수 `VITE_API_BASE_URL`이 Render URL인지 확인한 뒤 재배포합니다.
