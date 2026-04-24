# ITDA Flask Backend

Flask와 MongoDB로 만든 잇다 MVP API 서버입니다.

## 로컬 실행

MongoDB 실행:

```bash
open -a Docker
docker run --name itda-mongo -p 27017:27017 -d mongo:7
```

이미 컨테이너가 있다면:

```bash
docker start itda-mongo
```

Flask 실행:

```bash
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

## Render 배포

Render Web Service 설정:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`

Render 환경변수:

- `SECRET_KEY`: 긴 랜덤 문자열
- `MONGO_URI`: MongoDB Atlas connection string
- `CORS_ORIGINS`: Vercel 프론트 URL
- `SEED_SAMPLE_DATA`: `true`
- `FLASK_DEBUG`: `false`
- `SESSION_COOKIE_SAMESITE`: `None`
- `SESSION_COOKIE_SECURE`: `true`

## 환경변수 설명

- `PORT`: Flask 포트, 로컬 기본값 `5050`
- `SECRET_KEY`: 세션 암호화 키
- `MONGO_URI`: MongoDB 연결 문자열
- `CORS_ORIGINS`: 허용할 프론트엔드 주소 목록
- `SEED_SAMPLE_DATA`: 샘플 데이터 자동 생성 여부
- `FLASK_DEBUG`: 개발 서버 디버그 모드 여부
- `SESSION_COOKIE_SAMESITE`: 로컬은 `Lax`, 배포는 `None`
- `SESSION_COOKIE_SECURE`: 로컬은 `false`, 배포는 `true`

## 샘플 계정

```text
sample@itda.test / 1234
```
