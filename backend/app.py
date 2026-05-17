# =========================
# 필요한 라이브러리 import
# =========================

#운영체제 관련 기능 사용
import os
#날짜 및 시간 처리
from datetime import datetime, timezone
#데코레이션 함수 작성 시 사용
from functools import wraps

#objectid 처리
from bson import ObjectId
#.env환경변수
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from flask_cors import CORS
#토큰 생성 및 검증
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
#mongodb 연결
from pymongo import MongoClient
#에러 처리
from pymongo.errors import PyMongoError
#비밀번호 암호화 및 확인
from werkzeug.security import check_password_hash, generate_password_hash
# 개선: 비밀번호나 DB 주소 같은 민감한 값은 환경변수로 관리하세요.
# 개선: 배포할 때는 `requirements.txt`에 패키지 버전을 고정하세요.

# =========================
# 환경변수 로드
# =========================

load_dotenv()

# 비밀번호 암호화 방식
PASSWORD_HASH_METHOD = "pbkdf2:sha256"
# 허용 카테고리
CATEGORIES = {"teamplay", "meal", "roommate", "global"}
# 카테고리 별칭 처리
CATEGORY_ALIASES = {"team": "teamplay", "teamplay": "teamplay", "meal": "meal", "roommate": "roommate", "global": "global"}
# 허용 수단
CONTACT_TYPES = {"", "kakao", "instagram", "phone", "email", "openchat"}
#룸메 체크리스트
ROOMMATE_CHECKLIST_FIELDS = {
    "gender",
    "grade",
    "majorGroup",
    "wakeTime",
    "sleepTime",
    "showerTime",
    "cleaning",
    "alarm",
    "smoking",
    "drinking",
    "guest",
    "study",
    "nightMeal",
    "homeVisit",
    "bug",
    "sleepHabit",
    "mbti",
    "mbtiEI",
    "mbtiSN",
    "mbtiTF",
    "mbtiJP",
    "heat",
    "cold",
}
#카테고리
CATEGORY_LABELS = {
    "teamplay": "팀플",
    "meal": "밥",
    "roommate": "룸메",
    "global": "외국인 교류",
}

# =========================
# Flask 앱 생성
# =========================

app = Flask(__name__)
# SECRET_KEY 설정
app.secret_key = os.getenv("SECRET_KEY") or os.urandom(32)
# 세션 보안 설정
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"

# 개선: 운영환경에서는 `SECRET_KEY`를 환경변수로 꼭 설정하세요. 로컬용 임시키는 사용하지 마세요.

# =========================
# CORS 설정
# =========================

# 허용 origin 목록
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
#적용
if cors_origins:
    CORS(app, supports_credentials=True, origins=cors_origins)

# 개선: CORS는 필요한 주소만 허용하세요. 모든 주소 허용은 보안에 취약합니다.

# =========================
# MongoDB 연결
# =========================

# MongoDB URI 가져오기
mongo_uri = os.getenv("MONGO_URI")
# URI 없으면 에러
if not mongo_uri:
    raise RuntimeError("MONGO_URI 환경변수가 필요합니다.")

#연결
client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
db = client.get_default_database()
users = db.users
posts = db.posts
#토큰
token_serializer = URLSafeTimedSerializer(app.secret_key)

# 개선: DB 연결 문제는 로그에 잘 남기고, 보안 옵션(TLS 등)을 확인하세요.
# 개선: 토큰 만료 시간을 정해두고 어떻게 다시 발급할지 문서로 남기세요.

# =========================
# 현재 시간 반환 함수
# =========================


def now():
    return datetime.now(timezone.utc)

# =========================
# 사용자 데이터 직렬화
# =========================

def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "major": user.get("major", ""),
    }

# =========================
# 로그인 토큰 생성
# =========================

def make_auth_token(user_id):
    return token_serializer.dumps({"user_id": str(user_id)}, salt="itda-auth")

# =========================
# 토큰으로 사용자 조회
# =========================

def user_from_token(token):
    try:
        data = token_serializer.loads(token, salt="itda-auth", max_age=60 * 60 * 24 * 14)
        return users.find_one({"_id": ObjectId(data["user_id"])})
    except (BadSignature, SignatureExpired, KeyError, TypeError, ValueError):
        return None

# =========================
# 게시글 데이터 직렬화
# =========================

def serialize_post(post):
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "category": post["category"],
        "content": post["content"],
        "keywords": post.get("keywords", ""),
        "location": post.get("location", ""),
        "meeting_time": post.get("meeting_time", ""),
        "contactType": post.get("contactType", post.get("contact_type", "")),
        "contactValue": post.get("contactValue", post.get("contact_value", "")),
        "roommateChecklist": post.get("roommateChecklist", {}),
        "author_id": str(post["author_id"]),
        "author_name": post.get("author_name", "익명"),
        "created_at": post["created_at"].isoformat(),
        "updated_at": post["updated_at"].isoformat(),
    }

# =========================
# 에러 응답
# =========================

def error(message, status=400):
    return jsonify({"error": message}), status

# =========================
# 현재 로그인 사용자 조회
# =========================

def current_user():
    # 세션 기반 로그인 확인
    user_id = session.get("user_id")
    if user_id:
        try:
            user = users.find_one({"_id": ObjectId(user_id)})
            if user:
                return user
        except Exception:
            pass
        
    # Authorization 헤더 확인
    auth_header = request.headers.get("Authorization", "")
    # Bearer 토큰 확인
    if auth_header.startswith("Bearer "):
        return user_from_token(auth_header.removeprefix("Bearer ").strip())

    return None

# =========================
# 로그인 필수 데코레이터
# =========================

def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        # 로그인 안 했으면 에러
        if not user:
            return error("로그인이 필요합니다.", 401)
        return view(user, *args, **kwargs)

    return wrapped

# =========================
# 게시글 입력값 검증
# =========================


def validate_post_payload(payload):
    #제목, 내용, 카테고리, 연락수단, 체크리스트
    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    category = CATEGORY_ALIASES.get(payload.get("category"), payload.get("category"))
    contact_type = (payload.get("contactType") or "").strip()
    raw_roommate_checklist = payload.get("roommateChecklist") or {}

    #검사
    if not title:
        return None, "제목을 입력해주세요."
    if not content:
        return None, "내용을 입력해주세요."
    if category not in CATEGORIES:
        return None, "지원하지 않는 카테고리입니다."
    if contact_type not in CONTACT_TYPES:
        return None, "지원하지 않는 연락 수단입니다."
    if not isinstance(raw_roommate_checklist, dict):
        return None, "룸메 체크리스트 형식이 올바르지 않습니다."

    # 허용 필드만 저장
    roommate_checklist = {
        key: str(value).strip()
        for key, value in raw_roommate_checklist.items()
        if key in ROOMMATE_CHECKLIST_FIELDS and str(value).strip()
    }
    # 정리된 데이터 반환
    return {
        "title": title,
        "content": content,
        "category": category,
        "keywords": (payload.get("keywords") or "").strip(),
        "location": (payload.get("location") or "").strip(),
        "meeting_time": (payload.get("meeting_time") or "").strip(),
        "contactType": contact_type,
        "contactValue": (payload.get("contactValue") or "").strip(),
        "roommateChecklist": roommate_checklist if category == "roommate" else {},
    }, None

    # 개선: 입력 값 검사는 나중에 한 곳에서 쉽게 확인할 수 있게 라이브러리로 정리하면 편해요.

# =========================
# MongoDB 인덱스 생성 함수
# =========================

def ensure_indexes():
    # 이메일 중복 방지 index
    users.create_index("email", unique=True)
     # 제목/내용/키워드 검색용 text index
    posts.create_index([("title", "text"), ("content", "text"), ("keywords", "text")])
    # 카테고리 검색 최적화
    posts.create_index("category")
    # 생성일 기준 정렬 최적화
    posts.create_index("created_at")

# =========================
# 샘플 데이터 생성 함수
# =========================
def seed_sample_data():
    # 환경변수로 샘플 데이터 비활성화 가능
    if os.getenv("SEED_SAMPLE_DATA", "true").lower() != "true":
        return
    # 이미 데이터 있으면 종료
    if users.count_documents({}) > 0 or posts.count_documents({}) > 0:
        return

    #샘플
    sample_user_id = users.insert_one(
        {
            "name": "잇다 샘플",
            "email": "sample@itda.test",
            "major": "컴퓨터공학과",
            "password_hash": generate_password_hash("1234", method=PASSWORD_HASH_METHOD),
            "created_at": now(),
        }
    ).inserted_id

    #샘플
    sample_posts = [
        {
            "title": "웹프로그래밍 팀플 프론트엔드 맡을 팀원 구해요",
            "category": "teamplay",
            "content": "React 화면 구현을 같이 맡아줄 팀원을 찾습니다. 일정은 주 2회 정도 맞춰서 진행하고, 역할 분담을 명확하게 하는 편입니다.",
            "keywords": "React, 발표, GitHub",
            "location": "중앙도서관 스터디룸",
            "meeting_time": "화/목 18시 이후",
            "contactType": "openchat",
            "contactValue": "웹프팀플방",
        },
        {
            "title": "오늘 학생식당에서 같이 저녁 먹을 사람",
            "category": "meal",
            "content": "시험 끝나고 가볍게 밥 먹을 사람 찾습니다. 처음 봐도 편하게 이야기할 수 있으면 좋아요.",
            "keywords": "저녁, 학생식당, 번개",
            "location": "학생식당",
            "meeting_time": "오늘 18:30",
            "contactType": "kakao",
            "contactValue": "itda_meal",
        },
        {
            "title": "조용하고 깔끔한 룸메이트 찾습니다",
            "category": "roommate",
            "content": "기숙사 신청 전에 생활 패턴이 맞는 분과 이야기해보고 싶습니다. 밤에는 조용한 편이고 청소 규칙을 정하는 것을 선호합니다.",
            "keywords": "기숙사, 조용함, 청결",
            "location": "학교 근처",
            "meeting_time": "이번 주 상담 가능",
            "contactType": "email",
            "contactValue": "sample@itda.test",
            "roommateChecklist": {
                "gender": "상관없음",
                "wakeTime": "8",
                "sleepTime": "12",
                "showerTime": "저녁",
                "cleaning": "중간중간",
                "alarm": "잘들어요",
                "smoking": "비흡연",
                "guest": "사전허락",
                "study": "도서관",
                "nightMeal": "별로",
                "bug": "못잡음",
            },
        },
        {
            "title": "한국어/영어 언어교환 친구 구해요",
            "category": "global",
            "content": "영어 회화 연습을 하고 싶고, 한국어를 배우는 교환학생에게 학교 생활도 도와줄 수 있습니다.",
            "keywords": "영어, 한국어, 카페",
            "location": "교내 카페",
            "meeting_time": "수요일 오후",
            "contactType": "instagram",
            "contactValue": "@itda_global",
        },
    ]

    #현재시간
    created = now()
    #게시글 여러 개 삽입
    posts.insert_many(
        [
            {
                **post,
                "author_id": sample_user_id,
                "author_name": "잇다 샘플",
                "created_at": created,
                "updated_at": created,
            }
            for post in sample_posts
        ]
    )

# =========================
# DB 초기화 함수
# =========================

def initialize_database():
    try:
        client.admin.command("ping")
        ensure_indexes()
        seed_sample_data()
    except PyMongoError as exc:
        app.logger.warning("MongoDB initialization skipped: %s", exc)
    # 개선: DB 초기화가 실패하면 재시도하거나 로그로 운영자가 알 수 있게 하세요.

# =========================
# 서버 상태 확인 API
# =========================


@app.get("/api/health")
def health():
    try:
        client.admin.command("ping")
        mongo_status = "connected"
    except PyMongoError:
        mongo_status = "disconnected"
    return jsonify(
        {
            "message": "Flask 서버 실행 중",
            "mongo": mongo_status,
        }
    )

# =========================
# 회원가입 API
# =========================

@app.post("/api/auth/register")
def register():
    # JSON 데이터 가져오기
    payload = request.get_json(silent=True) or {}
    # 입력값 정리
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    major = (payload.get("major") or "").strip()

    # 필수값 검사
    if not name or not email or not password:
        return error("이름, 이메일, 비밀번호를 입력해주세요.")
    if len(password) < 4:
        return error("비밀번호는 4자 이상이어야 합니다.")
    if users.find_one({"email": email}):
        return error("이미 가입된 이메일입니다.", 409)

    #사용자 저장
    user_id = users.insert_one(
        {
            "name": name,
            "email": email,
            "major": major,
            # 암호화 비밀번호 저장
            "password_hash": generate_password_hash(password, method=PASSWORD_HASH_METHOD),
            "created_at": now(),
        }
    ).inserted_id
    session["user_id"] = str(user_id) #세션 저장
    user = users.find_one({"_id": user_id}) #사용자 조회
    return jsonify({"token": make_auth_token(user_id), "user": serialize_user(user)}), 201

# =========================
# 로그인 API
# =========================

@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {} #json 데이터 받기
    email = (payload.get("email") or "").strip().lower() #이메일 입력값 정리
    password = payload.get("password") or "" #비밀번호 가져오기
    user = users.find_one({"email": email}) #이메일로 사용자 조회

    if not user or not check_password_hash(user["password_hash"], password): #사용자가 아니거나 비밀번호 오류
        return error("이메일 또는 비밀번호가 올바르지 않습니다.", 401)
# 브루트포스 공격 방지 위해 로그인 실패 시에도 일정 시간 지연이 좋을 듯
    session["user_id"] = str(user["_id"]) #로그인 세션 저장
    return jsonify({"token": make_auth_token(user["_id"]), "user": serialize_user(user)})

# =========================
# 로그아웃 API
# =========================

@app.post("/api/auth/logout")
def logout():
    #세션 초기화
    session.clear()
    return jsonify({"message": "로그아웃되었습니다."})

# =========================
# 현재 로그인 사용자 조회 API
# =========================

@app.get("/api/auth/me")
def me():
    # 현재 로그인 사용자 조회
    user = current_user()
     # 로그인 안 된 경우
    if not user:
        return error("로그인 상태가 아닙니다.", 401)
    return jsonify({"user": serialize_user(user)})

# =========================
# 게시글 목록 조회 API
# =========================

@app.get("/api/posts")
def list_posts():
    category = request.args.get("category")
    keyword = (request.args.get("q") or "").strip()
    query = {}

    if category: #카테고리 필터
        category = CATEGORY_ALIASES.get(category, category)
        if category not in CATEGORIES:
            return error("지원하지 않는 카테고리입니다.")
        query["category"] = category

    if keyword: #검색어 필터
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"content": {"$regex": keyword, "$options": "i"}},
            {"keywords": {"$regex": keyword, "$options": "i"}},
        ]

    found_posts = posts.find(query).sort("created_at", -1) #최신순 정렬
    return jsonify({"posts": [serialize_post(post) for post in found_posts]})
    # 개선: 글 목록은 페이지 나누기(paging)를 추가해서 한 번에 너무 많은 데이터를 보내지 마세요.
    # 개선: 정규식 검색은 느릴 수 있어요. 텍스트 인덱스나 검색 서비스를 고려하세요.

# =========================
# 게시글 작성 API
# =========================

@app.post("/api/posts")
@login_required
def create_post(user):
    payload = request.get_json(silent=True) or {} #데이터 로드
    clean_payload, message = validate_post_payload(payload)
    if message: #오류 발생
        return error(message)

    created = now() #현재 시간
    post_id = posts.insert_one( #게시글 작성
        {
            **clean_payload,
            "author_id": user["_id"],
            "author_name": user["name"],
            "created_at": created,
            "updated_at": created,
        }
    ).inserted_id

    post = posts.find_one({"_id": post_id}) #저장된 게시글 조회
    return jsonify({"post": serialize_post(post)}), 201
    # 개선: 여러 DB 작업을 함께 해야 하면 묶어서 처리하세요.

# =========================
# 게시글 단일 조회 API
# =========================

@app.get("/api/posts/<post_id>")
def get_post(post_id):
    try:
        # 게시글 ID로 조회
        post = posts.find_one({"_id": ObjectId(post_id)})
    except Exception:  # ObjectId 변환 실패
        return error("잘못된 글 ID입니다.", 400)
    if not post:  # 게시글 없는 경우
        return error("글을 찾을 수 없습니다.", 404)
    return jsonify({"post": serialize_post(post)})

# =========================
# 게시글 수정 API
# =========================

@app.put("/api/posts/<post_id>")
@login_required
def edit_post(user, post_id):
    try: # 문자열 ID → ObjectId 변환
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id}) #게시글 조회
    if not post: #게시글 없는 경우
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] != user["_id"]: #작성자 검사
        return error("작성자만 수정할 수 있습니다.", 403)

    payload = request.get_json(silent=True) or {} #수정 데이터 로드
    clean_payload, message = validate_post_payload(payload) #입력값 검증
    if message:
        return error(message)

    posts.update_one( #게시글 업데이트
        {"_id": object_id},
        {"$set": {**clean_payload, "updated_at": now()}},
    )
    updated = posts.find_one({"_id": object_id}) #수정된 게시글 조회
    return jsonify({"post": serialize_post(updated)})

# =========================
# 게시글 삭제 API
# =========================

@app.delete("/api/posts/<post_id>")
@login_required
def remove_post(user, post_id):
    try: # ObjectId 변환
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id}) #게시글 조회
    if not post: #없음
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] != user["_id"]: #작성자 확인
        return error("작성자만 삭제할 수 있습니다.", 403)
    #게시글 삭제
    posts.delete_one({"_id": object_id})
    return jsonify({"message": "삭제되었습니다."})

# =========================
# AI 추천 게시글 생성 API
# =========================

@app.post("/api/ai/recommend")
def ai_recommend():
    # 요청 JSON 데이터 받기
    payload = request.get_json(silent=True) or {}
    # 사용자가 보낸 카테고리 고려해서 변환
    requested_category = CATEGORY_ALIASES.get(payload.get("category"), payload.get("category"))
    # 올바른 카테고리면 사용하고, 아니면 teamplay 사용
    category = requested_category if requested_category in CATEGORIES else "teamplay"
    label = CATEGORY_LABELS[category]
    raw_keywords = (payload.get("keywords") or "").strip() # 사용자가 입력한 키워드 가져오기
    keywords = raw_keywords or "시간 맞는 사람, 부담 없는 만남" # 키워드가 없으면 기본 문구 사용

    # 카테고리별 추천 게시글 제목과 내용 템플릿
    templates = {
        "teamplay": {
            "title": f"{keywords} 중심으로 같이 할 팀플 팀원 구해요",
            "content": f"{keywords} 조건에 맞는 팀원을 찾습니다.\n역할을 명확히 나누고 마감 전에 미리 확인하는 방식으로 진행하고 싶어요.\n가능한 시간과 맡고 싶은 역할을 댓글이나 연락으로 알려주세요.",
        },
        "meal": {
            "title": f"{keywords} 같이 할 밥 친구 구해요",
            "content": f"{keywords} 느낌으로 가볍게 밥 먹을 사람을 찾습니다.\n처음 봐도 부담 없이 이야기하면 좋겠고, 메뉴와 장소는 같이 정해도 좋아요.",
        },
        "roommate": {
            "title": f"{keywords} 맞는 룸메이트 찾습니다",
            "content": f"{keywords} 생활 패턴을 중요하게 생각하는 룸메이트를 찾습니다.\n청소, 소음, 취침 시간 같은 기본 규칙을 미리 이야기하고 맞춰보고 싶어요.",
        },
        "global": {
            "title": f"{keywords} 기반 언어/문화 교류 친구 구해요",
            "content": f"{keywords} 주제로 편하게 교류할 친구를 찾습니다.\n언어 연습과 학교 생활 이야기를 함께 나누고, 서로 도와줄 수 있으면 좋겠습니다.",
        },
    }
    # 선택된 카테고리의 추천 제목/내용 반환
    return jsonify({"category": category, "label": label, **templates[category]})
    # 개선: 외부 AI를 쓸 땐 개인정보를 보내지 말고, 입력을 꼭 확인하세요.
    # 개선: 사용자가 입력한 문장을 그대로 노출하지 않도록 조심하세요.

# 데이터베이스 초기화 실행
initialize_database()

# 현재 파일을 직접 실행했을 때 Flask 서버 실행
if __name__ == "__main__":
    app.run(
        host="0.0.0.0", #모든 ip에서 실행
        port=int(os.getenv("PORT", "5050")), #포트 사용하거나 5050번 사용
        debug=os.getenv("FLASK_DEBUG", "true").lower() == "true", #디버그 모드 설정
        use_reloader=False, #재시작 기능 없음
    )
    # 개선: 배포할 때는 내장 서버 대신 WSGI 서버를 쓰고, 디버그 모드는 꺼두세요.
