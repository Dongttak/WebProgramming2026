# 잇다(ITDA)

대학생들이 팀플, 밥, 룸메, 외국인 교류 목적별로 매칭 글을 작성하고 조회할 수 있는 웹프로그래밍 기말 조별과제용 MVP입니다.

## 구현된 기능

- 회원가입, 로그인, 로그아웃
- Flask 세션 쿠키와 Bearer 토큰 기반 로그인 상태 유지
- 학교 이메일 mock 인증: `@sju.ac.kr` 인증번호 생성/확인
- 내 정보 입력 후 글 작성/신청 가능
- MongoDB 기반 매칭 글 작성/목록/상세/삭제
- 모집 글 신뢰도를 위해 작성 후 수정 불가
- 카테고리별 게시판: 팀플, 밥, 룸메, 외국인 교류
- 태그/검색 기능
- 룸메 게시판용 생활 패턴 체크리스트와 MBTI 4축 선택
- 에타 글 작성 확인 정보 저장
- 연락처는 신청 승인 후 공개
- 신청 댓글, 글쓴이 승인/거절, 승인 후 연락처 상호 공개
- 키워드 기반 mock AI 추천 API
- Vercel/Render/MongoDB Atlas 배포 구조

## 주요 화면 URL

- `/`: 홈
- `/login`: 로그인
- `/signup`: 회원가입
- `/profile`: 내 정보 및 학교 이메일 인증
- `/boards`: 전체 게시판
- `/boards/team`: 팀플 게시판
- `/boards/meal`: 밥 매칭 게시판
- `/boards/roommate`: 룸메 게시판
- `/boards/global`: 외국인 교류 게시판
- `/posts/new`: 글 작성
- `/posts/:id`: 글 상세/삭제/신청/승인
- `/posts/:id/edit`: 수정 불가 안내

## 로컬 실행

### 1. MongoDB 실행

```bash
docker start itda-mongo
```

컨테이너가 없다면:

```bash
docker run --name itda-mongo -p 27017:27017 -d mongo:7
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

브라우저에서 `http://localhost:5173`에 접속합니다. 로컬에서는 `.env`의 `VITE_API_BASE_URL`을 비워두고 `VITE_BACKEND_URL=http://127.0.0.1:5050`으로 둡니다.

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
SCHOOL_EMAIL_DOMAIN=@sju.ac.kr
SCHOOL_EMAIL_CODE_TTL_MINUTES=10
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
SCHOOL_EMAIL_DOMAIN=@sju.ac.kr
SCHOOL_EMAIL_CODE_TTL_MINUTES=10
```

비밀번호, MongoDB URI, API key 같은 비밀값은 코드에 직접 쓰지 말고 각 서비스의 Environment Variables에만 넣습니다.

## 배포

### Render 백엔드

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`

Render 환경변수에는 `SECRET_KEY`, `MONGO_URI`, `CORS_ORIGINS`, `SESSION_COOKIE_SAMESITE=None`, `SESSION_COOKIE_SECURE=true`를 꼭 설정합니다.

### Vercel 프론트엔드

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Environment Variable: `VITE_API_BASE_URL=https://your-render-service.onrender.com`

## 샘플 데이터

`SEED_SAMPLE_DATA=true`이고 DB가 비어 있으면 샘플 계정과 글이 생성됩니다.

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
- `PUT /api/users/me/profile`
- `POST /api/users/me/school-email/request-code`
- `POST /api/users/me/school-email/verify-code`
- `GET /api/posts?category=team&q=React`
- `POST /api/posts`
- `GET /api/posts/:id`
- `PUT /api/posts/:id` - 수정 불가 안내 `403`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/applications`
- `GET /api/posts/:id/applications`
- `PATCH /api/applications/:id`
- `POST /api/ai/recommend`

학교 이메일 인증은 과제 MVP 안정성을 위해 실제 메일 발송 대신 mock 인증번호를 화면에 보여줍니다. 실제 서비스에서는 같은 API 구조에서 SMTP/SendGrid 발송으로 교체할 수 있습니다.

## 배포 후 테스트 체크리스트

1. Render `/api/health` 응답에서 `mongo: connected` 확인
2. Vercel 사이트 접속
3. 회원가입/로그인
4. 새로고침 후 로그인 상태 유지 확인
5. `@sju.ac.kr` 학교 이메일 mock 인증
6. 내 정보 저장
7. 매칭 글 작성
8. 카테고리별 게시판 필터 확인
9. 태그 검색 확인
10. 상세 조회에서 연락처가 승인 전 숨겨지는지 확인
11. 다른 계정으로 신청 댓글 작성
12. 작성자 계정으로 신청자 프로필/연락처 확인 및 승인
13. 승인된 신청자 계정에서 글쓴이 연락처 확인
14. 글 수정 불가 안내 확인
15. 글 삭제 확인
16. AI 추천 버튼 확인
17. Console/CORS 오류 확인

## 자주 나는 배포 오류

- CORS 오류: Render의 `CORS_ORIGINS`에 Vercel URL이 정확히 들어갔는지 확인합니다.
- 로그인 유지 안 됨: Bearer 토큰이 localStorage에 저장되는지, Render 쿠키 설정이 맞는지 확인합니다.
- DB 연결 실패: Atlas `MONGO_URI`, DB 사용자 비밀번호, Network Access 설정을 확인합니다.
- 프론트가 로컬 API로 요청함: Vercel 환경변수 `VITE_API_BASE_URL`이 Render URL인지 확인한 뒤 재배포합니다.
