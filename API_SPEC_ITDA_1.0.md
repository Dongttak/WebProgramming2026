# 잇다(ITDA) API 명세서

Frontend(Vite React SPA) ↔ Backend(Flask) 통신 규격 v1.1

## 엔드포인트 요약

| Method | Path | 용도 | 인증 |
|---|---|---|---|
| `GET` | `/api/health` | 서버/MongoDB 상태 확인 | 불필요 |
| `POST` | `/api/auth/register` | 회원가입 | 불필요 |
| `POST` | `/api/auth/login` | 로그인 | 불필요 |
| `POST` | `/api/auth/logout` | 로그아웃 | 선택 |
| `GET` | `/api/auth/me` | 현재 로그인 사용자 조회 | 필요 |
| `PUT` | `/api/users/me/profile` | 내 정보/학교 이메일/연락처 저장 | 필요 |
| `POST` | `/api/users/me/school-email/request-code` | 학교 이메일 mock 인증번호 요청 | 필요 |
| `POST` | `/api/users/me/school-email/verify-code` | 학교 이메일 인증번호 확인 | 필요 |
| `GET` | `/api/posts` | 게시글 목록/검색/카테고리 필터 | 불필요 |
| `POST` | `/api/posts` | 게시글 작성 | 필요 |
| `GET` | `/api/posts/:id` | 게시글 상세 | 불필요 |
| `PUT` | `/api/posts/:id` | 수정 불가 안내 | 필요 |
| `PATCH` | `/api/posts/:id/status` | 구인 완료/구인 재개 | 작성자 |
| `DELETE` | `/api/posts/:id` | 게시글 삭제 | 작성자 |
| `POST` | `/api/posts/:id/applications` | 신청 댓글 작성 | 필요 |
| `GET` | `/api/posts/:id/applications` | 신청 목록/내 신청 조회 | 필요 |
| `PATCH` | `/api/applications/:id` | 신청 승인/거절 | 글쓴이 |
| `POST` | `/api/ai/recommend` | mock AI 추천 | 불필요 |

## 인증

로그인/회원가입 성공 응답에는 `token`이 포함된다. 프론트는 이 값을 `localStorage`에 저장하고 이후 요청에 아래 헤더를 붙인다.

```http
Authorization: Bearer <token>
```

Flask 세션 쿠키도 함께 지원하지만, 배포 환경에서 안정성을 위해 Bearer 토큰을 우선 사용한다.

## 카테고리

| 화면 경로 | API 필터 값 | DB 저장값 |
|---|---|---|
| `/boards/team` | `teamplay` 또는 `team` | `teamplay` |
| `/boards/meal` | `meal` | `meal` |
| `/boards/roommate` | `roommate` | `roommate` |
| `/boards/global` | `global` | `global` |

## 학교 이메일 인증

기본 도메인은 `@sju.ac.kr`이다. 과제 MVP에서는 실제 이메일 발송 대신 응답에 `mockCode`를 포함한다.

### 인증번호 요청

`POST /api/users/me/school-email/request-code`

```json
{
  "schoolEmail": "student@sju.ac.kr"
}
```

응답:

```json
{
  "message": "개발용 인증번호가 생성되었습니다.",
  "mockCode": "123456",
  "expiresAt": "2026-05-29T12:10:00+00:00"
}
```

### 인증번호 확인

`POST /api/users/me/school-email/verify-code`

```json
{
  "schoolEmail": "student@sju.ac.kr",
  "code": "123456"
}
```

## 내 정보 저장

`PUT /api/users/me/profile`

```json
{
  "name": "홍길동",
  "major": "컴퓨터공학과",
  "studentId": "20240001",
  "gender": "공개 안 함",
  "profileText": "팀플은 일정 공유를 잘하는 편입니다.",
  "schoolEmail": "hong@sju.ac.kr",
  "contactType": "openchat",
  "contactValue": "itda-openchat"
}
```

글 작성과 신청은 학교 이메일 인증, 내 정보, 승인 후 공개 연락처가 모두 저장된 뒤 가능하다.

## 게시글 작성

`POST /api/posts`

```json
{
  "title": "웹프로그래밍 팀플 팀원 구해요",
  "category": "teamplay",
  "keywords": "React, 발표",
  "meeting_time": "화요일 18시",
  "categoryDetails": {
    "activityType": "수업명",
    "activityName": "웹프로그래밍",
    "activityDetail": "React 프론트엔드"
  },
  "contactType": "openchat",
  "contactValue": "itda-team-chat",
  "content": "React 화면 구현을 같이 할 팀원을 찾습니다.",
  "roommateChecklist": {}
}
```

카테고리별 필수 정보:

- 팀플: `activityType`, `activityName`, `activityDetail`
- 밥: `menu`, `drinking`
- 외국인 교류: `desiredLanguage`, `offeredLanguage`, `hobby`, `activityArea`
- 룸메: `gender`, `grade`, `wakeTime`, `sleepTime`, `cleaning`, `smoking`

룸메 MBTI는 `mbtiEI`, `mbtiSN`, `mbtiTF`, `mbtiJP` 4개 축으로 저장한다.

## 연락처 공개 정책

게시글의 `contactType`, `contactValue`는 작성자 본인 또는 승인된 신청자에게만 내려간다. 승인 전에는 다음처럼 내려간다.

```json
{
  "contactType": "",
  "contactValue": "",
  "contactVisible": false,
  "contactPolicy": "after_approval"
}
```

## 신청/승인

신청자는 아래 API로 신청 댓글을 남긴다.

`POST /api/posts/:id/applications`

```json
{
  "message": "프로필 확인 부탁드립니다. 일정 맞춰서 참여 가능합니다."
}
```

글쓴이는 신청 목록을 보고 승인/거절한다.

`PATCH /api/applications/:id`

```json
{
  "status": "approved"
}
```

승인 후 신청자는 게시글 상세에서 글쓴이 연락처를 볼 수 있다. 글쓴이는 신청자 관리 영역에서 신청자의 프로필과 연락처를 볼 수 있다.

## 구인 상태

작성자는 아래 API로 글 상태를 바꿀 수 있다. `closed` 상태의 글에는 새 신청을 남길 수 없다.

`PATCH /api/posts/:id/status`

```json
{
  "status": "closed"
}
```

## 배포 환경변수

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
