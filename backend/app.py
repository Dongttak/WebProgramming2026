import os
from datetime import datetime, timezone
from functools import wraps

from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

PASSWORD_HASH_METHOD = "pbkdf2:sha256"
CATEGORIES = {"teamplay", "meal", "roommate", "global"}
CATEGORY_ALIASES = {"team": "teamplay", "teamplay": "teamplay", "meal": "meal", "roommate": "roommate", "global": "global"}
CONTACT_TYPES = {"", "kakao", "instagram", "phone", "email", "openchat"}
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
CATEGORY_LABELS = {
    "teamplay": "팀플",
    "meal": "밥",
    "roommate": "룸메",
    "global": "외국인 교류",
}

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY") or os.urandom(32)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
if cors_origins:
    CORS(app, supports_credentials=True, origins=cors_origins)

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI 환경변수가 필요합니다.")

client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
db = client.get_default_database()
users = db.users
posts = db.posts


def now():
    return datetime.now(timezone.utc)


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "major": user.get("major", ""),
    }


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


def error(message, status=400):
    return jsonify({"error": message}), status


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    try:
        return users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user:
            return error("로그인이 필요합니다.", 401)
        return view(user, *args, **kwargs)

    return wrapped


def validate_post_payload(payload):
    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    category = CATEGORY_ALIASES.get(payload.get("category"), payload.get("category"))
    contact_type = (payload.get("contactType") or "").strip()
    raw_roommate_checklist = payload.get("roommateChecklist") or {}

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

    roommate_checklist = {
        key: str(value).strip()
        for key, value in raw_roommate_checklist.items()
        if key in ROOMMATE_CHECKLIST_FIELDS and str(value).strip()
    }

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


def ensure_indexes():
    users.create_index("email", unique=True)
    posts.create_index([("title", "text"), ("content", "text"), ("keywords", "text")])
    posts.create_index("category")
    posts.create_index("created_at")


def seed_sample_data():
    if os.getenv("SEED_SAMPLE_DATA", "true").lower() != "true":
        return
    if users.count_documents({}) > 0 or posts.count_documents({}) > 0:
        return

    sample_user_id = users.insert_one(
        {
            "name": "잇다 샘플",
            "email": "sample@itda.test",
            "major": "컴퓨터공학과",
            "password_hash": generate_password_hash("1234", method=PASSWORD_HASH_METHOD),
            "created_at": now(),
        }
    ).inserted_id

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

    created = now()
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


def initialize_database():
    try:
        client.admin.command("ping")
        ensure_indexes()
        seed_sample_data()
    except PyMongoError as exc:
        app.logger.warning("MongoDB initialization skipped: %s", exc)


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


@app.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    major = (payload.get("major") or "").strip()

    if not name or not email or not password:
        return error("이름, 이메일, 비밀번호를 입력해주세요.")
    if len(password) < 4:
        return error("비밀번호는 4자 이상이어야 합니다.")
    if users.find_one({"email": email}):
        return error("이미 가입된 이메일입니다.", 409)

    user_id = users.insert_one(
        {
            "name": name,
            "email": email,
            "major": major,
            "password_hash": generate_password_hash(password, method=PASSWORD_HASH_METHOD),
            "created_at": now(),
        }
    ).inserted_id
    session["user_id"] = str(user_id)
    user = users.find_one({"_id": user_id})
    return jsonify({"user": serialize_user(user)}), 201


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    user = users.find_one({"email": email})

    if not user or not check_password_hash(user["password_hash"], password):
        return error("이메일 또는 비밀번호가 올바르지 않습니다.", 401)

    session["user_id"] = str(user["_id"])
    return jsonify({"user": serialize_user(user)})


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"message": "로그아웃되었습니다."})


@app.get("/api/auth/me")
def me():
    user = current_user()
    if not user:
        return error("로그인 상태가 아닙니다.", 401)
    return jsonify({"user": serialize_user(user)})


@app.get("/api/posts")
def list_posts():
    category = request.args.get("category")
    keyword = (request.args.get("q") or "").strip()
    query = {}

    if category:
        category = CATEGORY_ALIASES.get(category, category)
        if category not in CATEGORIES:
            return error("지원하지 않는 카테고리입니다.")
        query["category"] = category

    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"content": {"$regex": keyword, "$options": "i"}},
            {"keywords": {"$regex": keyword, "$options": "i"}},
        ]

    found_posts = posts.find(query).sort("created_at", -1)
    return jsonify({"posts": [serialize_post(post) for post in found_posts]})


@app.post("/api/posts")
@login_required
def create_post(user):
    payload = request.get_json(silent=True) or {}
    clean_payload, message = validate_post_payload(payload)
    if message:
        return error(message)

    created = now()
    post_id = posts.insert_one(
        {
            **clean_payload,
            "author_id": user["_id"],
            "author_name": user["name"],
            "created_at": created,
            "updated_at": created,
        }
    ).inserted_id

    post = posts.find_one({"_id": post_id})
    return jsonify({"post": serialize_post(post)}), 201


@app.get("/api/posts/<post_id>")
def get_post(post_id):
    try:
        post = posts.find_one({"_id": ObjectId(post_id)})
    except Exception:
        return error("잘못된 글 ID입니다.", 400)
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    return jsonify({"post": serialize_post(post)})


@app.put("/api/posts/<post_id>")
@login_required
def edit_post(user, post_id):
    try:
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id})
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] != user["_id"]:
        return error("작성자만 수정할 수 있습니다.", 403)

    payload = request.get_json(silent=True) or {}
    clean_payload, message = validate_post_payload(payload)
    if message:
        return error(message)

    posts.update_one(
        {"_id": object_id},
        {"$set": {**clean_payload, "updated_at": now()}},
    )
    updated = posts.find_one({"_id": object_id})
    return jsonify({"post": serialize_post(updated)})


@app.delete("/api/posts/<post_id>")
@login_required
def remove_post(user, post_id):
    try:
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id})
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] != user["_id"]:
        return error("작성자만 삭제할 수 있습니다.", 403)

    posts.delete_one({"_id": object_id})
    return jsonify({"message": "삭제되었습니다."})


@app.post("/api/ai/recommend")
def ai_recommend():
    payload = request.get_json(silent=True) or {}
    requested_category = CATEGORY_ALIASES.get(payload.get("category"), payload.get("category"))
    category = requested_category if requested_category in CATEGORIES else "teamplay"
    label = CATEGORY_LABELS[category]
    raw_keywords = (payload.get("keywords") or "").strip()
    keywords = raw_keywords or "시간 맞는 사람, 부담 없는 만남"

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

    return jsonify({"category": category, "label": label, **templates[category]})


initialize_database()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5050")),
        debug=os.getenv("FLASK_DEBUG", "true").lower() == "true",
        use_reloader=False,
    )
