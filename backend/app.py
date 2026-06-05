import os
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

PASSWORD_HASH_METHOD = "pbkdf2:sha256"
CATEGORIES = {"teamplay", "meal", "roommate", "global"}
CATEGORY_ALIASES = {
    "team": "teamplay",
    "teamplay": "teamplay",
    "meal": "meal",
    "roommate": "roommate",
    "global": "global",
}
CONTACT_TYPES = {"", "kakao", "instagram", "phone", "email", "openchat"}
SCHOOL_EMAIL_DOMAIN = os.getenv("SCHOOL_EMAIL_DOMAIN", "@sju.ac.kr").lower()
SCHOOL_EMAIL_CODE_TTL_MINUTES = int(os.getenv("SCHOOL_EMAIL_CODE_TTL_MINUTES", "10"))
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
applications = db.applications
token_serializer = URLSafeTimedSerializer(app.secret_key)


def now():
    return datetime.now(timezone.utc)


def normalize_school_email(value):
    return (value or "").strip().lower()


def valid_school_email(value):
    return normalize_school_email(value).endswith(SCHOOL_EMAIL_DOMAIN)


def tags_from_keywords(keywords):
    return [tag.strip() for tag in (keywords or "").replace("#", ",").split(",") if tag.strip()]


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "major": user.get("major", ""),
        "studentId": user.get("studentId", ""),
        "gender": user.get("gender", ""),
        "profileText": user.get("profileText", ""),
        "schoolEmail": user.get("schoolEmail", ""),
        "schoolEmailVerified": bool(user.get("schoolEmailVerified", False)),
        "contactType": user.get("contactType", ""),
        "contactValue": user.get("contactValue", ""),
    }


def make_auth_token(user_id):
    return token_serializer.dumps({"user_id": str(user_id)}, salt="itda-auth")


def user_from_token(token):
    try:
        data = token_serializer.loads(token, salt="itda-auth", max_age=60 * 60 * 24 * 14)
        return users.find_one({"_id": ObjectId(data["user_id"])})
    except (BadSignature, SignatureExpired, KeyError, TypeError, ValueError):
        return None


def can_view_post_contact(post, viewer):
    if not viewer:
        return False
    if post.get("author_id") == viewer["_id"]:
        return True
    return (
        applications.find_one(
            {
                "post_id": post["_id"],
                "applicant_id": viewer["_id"],
                "status": "approved",
            }
        )
        is not None
    )


def serialize_post(post, viewer=None):
    can_view_contact = can_view_post_contact(post, viewer)
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "category": post["category"],
        "content": post["content"],
        "keywords": post.get("keywords", ""),
        "tags": tags_from_keywords(post.get("keywords", "")),
        "meeting_time": post.get("meeting_time", ""),
        "categoryDetails": post.get("categoryDetails", {}),
        "contactPolicy": post.get("contactPolicy", "after_approval"),
        "contactType": post.get("contactType", post.get("contact_type", "")) if can_view_contact else "",
        "contactValue": post.get("contactValue", post.get("contact_value", "")) if can_view_contact else "",
        "contactVisible": can_view_contact,
        "roommateChecklist": post.get("roommateChecklist", {}),
        "status": post.get("status", "open"),
        "isClosed": post.get("status") == "closed",
        "isEditable": False,
        "author_id": str(post["author_id"]),
        "author_name": post.get("author_name", "익명"),
        "created_at": post["created_at"].isoformat(),
        "updated_at": post["updated_at"].isoformat(),
    }


def error(message, status=400):
    return jsonify({"error": message}), status


def current_user():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        user = user_from_token(auth_header.removeprefix("Bearer ").strip())
        if user:
            return user

    user_id = session.get("user_id")
    if user_id:
        try:
            user = users.find_one({"_id": ObjectId(user_id)})
            if user:
                return user
        except Exception:
            pass

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
    contact_value = (payload.get("contactValue") or "").strip()
    meeting_time = (payload.get("meeting_time") or "").strip()
    keywords = (payload.get("keywords") or "").strip()
    raw_category_details = payload.get("categoryDetails") or {}
    raw_roommate_checklist = payload.get("roommateChecklist") or {}

    if not title:
        return None, "제목을 입력해주세요."
    if not content:
        return None, "내용을 입력해주세요."
    if category not in CATEGORIES:
        return None, "지원하지 않는 카테고리입니다."
    if contact_type not in CONTACT_TYPES:
        return None, "지원하지 않는 연락 수단입니다."
    if not keywords:
        return None, "태그/키워드를 입력해주세요."
    if not meeting_time:
        return None, "희망 시간을 입력해주세요."
    if not contact_type or not contact_value:
        return None, "승인 후 공개할 연락 수단과 연락처를 입력해주세요."
    if not isinstance(raw_category_details, dict):
        return None, "카테고리별 정보 형식이 올바르지 않습니다."
    if not isinstance(raw_roommate_checklist, dict):
        return None, "룸메 체크리스트 형식이 올바르지 않습니다."

    category_detail_fields = {
        "teamplay": ["activityType", "activityName", "activityDetail"],
        "meal": ["menu", "drinking"],
        "global": ["desiredLanguage", "offeredLanguage", "hobby", "activityArea"],
    }
    category_details = {
        key: str(raw_category_details.get(key) or "").strip()
        for key in category_detail_fields.get(category, [])
    }
    missing_detail = [key for key, value in category_details.items() if not value]
    if missing_detail:
        return None, "카테고리별 필수 정보를 입력해주세요."

    roommate_checklist = {
        key: str(value).strip()
        for key, value in raw_roommate_checklist.items()
        if key in ROOMMATE_CHECKLIST_FIELDS and str(value).strip()
    }
    if category == "roommate":
        required_roommate_fields = {"gender", "grade", "wakeTime", "sleepTime", "cleaning", "smoking"}
        if any(not roommate_checklist.get(key) for key in required_roommate_fields):
            return None, "룸메 체크리스트 필수 항목을 선택해주세요."

    return {
        "title": title,
        "content": content,
        "category": category,
        "keywords": keywords,
        "meeting_time": meeting_time,
        "categoryDetails": category_details,
        "contactType": contact_type,
        "contactValue": contact_value,
        "contactPolicy": "after_approval",
        "roommateChecklist": roommate_checklist if category == "roommate" else {},
        "status": "open",
        "isEditable": False,
    }, None


def profile_completed(user):
    required = [
        "studentId",
        "gender",
        "profileText",
        "schoolEmail",
        "contactType",
        "contactValue",
    ]
    return (
        all((user.get(field) or "").strip() for field in required)
        and bool(user.get("schoolEmailVerified"))
    )


def serialize_application(application, viewer=None):
    applicant = users.find_one({"_id": application["applicant_id"]})
    post = posts.find_one({"_id": application["post_id"]})
    is_owner = bool(viewer and post and post.get("author_id") == viewer["_id"])
    is_applicant = bool(viewer and application["applicant_id"] == viewer["_id"])
    applicant_data = serialize_user(applicant) if applicant else None
    owner_contact = None

    if applicant_data and not is_owner:
        applicant_data["contactType"] = ""
        applicant_data["contactValue"] = ""

    if post and application.get("status") == "approved" and is_applicant:
        owner_contact = {
            "contactType": post.get("contactType", ""),
            "contactValue": post.get("contactValue", ""),
        }

    return {
        "id": str(application["_id"]),
        "postId": str(application["post_id"]),
        "applicantId": str(application["applicant_id"]),
        "message": application.get("message", ""),
        "status": application.get("status", "pending"),
        "applicant": applicant_data if (is_owner or is_applicant) else None,
        "ownerContact": owner_contact,
        "created_at": application["created_at"].isoformat(),
        "updated_at": application["updated_at"].isoformat(),
    }


def ensure_indexes():
    users.create_index("email", unique=True)
    posts.create_index([("title", "text"), ("content", "text"), ("keywords", "text")])
    posts.create_index("category")
    posts.create_index("created_at")
    applications.create_index([("post_id", 1), ("applicant_id", 1)], unique=True)
    applications.create_index("status")


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
            "studentId": "20240001",
            "gender": "상관없음",
            "profileText": "시연용 샘플 프로필입니다.",
            "schoolEmail": "sample@sju.ac.kr",
            "schoolEmailVerified": True,
            "contactType": "openchat",
            "contactValue": "sample-openchat",
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
            "meeting_time": "화/목 18시 이후",
            "categoryDetails": {
                "activityType": "수업명",
                "activityName": "웹프로그래밍",
                "activityDetail": "React 프론트엔드 구현",
            },
            "contactType": "openchat",
            "contactValue": "웹프팀플방",
            "contactPolicy": "after_approval",
            "status": "open",
        },
        {
            "title": "오늘 학생식당에서 같이 저녁 먹을 사람",
            "category": "meal",
            "content": "시험 끝나고 가볍게 밥 먹을 사람 찾습니다. 처음 봐도 편하게 이야기할 수 있으면 좋아요.",
            "keywords": "저녁, 학생식당, 번개",
            "meeting_time": "오늘 18:30",
            "categoryDetails": {
                "menu": "학생식당",
                "drinking": "안 마셔요",
            },
            "contactType": "kakao",
            "contactValue": "itda_meal",
            "contactPolicy": "after_approval",
            "status": "open",
        },
        {
            "title": "조용하고 깔끔한 룸메이트 찾습니다",
            "category": "roommate",
            "content": "기숙사 신청 전에 생활 패턴이 맞는 분과 이야기해보고 싶습니다. 밤에는 조용한 편이고 청소 규칙을 정하는 것을 선호합니다.",
            "keywords": "기숙사, 조용함, 청결",
            "meeting_time": "이번 주 상담 가능",
            "contactType": "email",
            "contactValue": "sample@itda.test",
            "contactPolicy": "after_approval",
            "status": "open",
            "roommateChecklist": {
                "gender": "여자",
                "grade": "24",
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
                "mbtiEI": "I",
                "mbtiSN": "S",
                "mbtiTF": "T",
                "mbtiJP": "P",
            },
        },
        {
            "title": "한국어/영어 언어교환 친구 구해요",
            "category": "global",
            "content": "영어 회화 연습을 하고 싶고, 한국어를 배우는 교환학생에게 학교 생활도 도와줄 수 있습니다.",
            "keywords": "영어, 한국어, 카페",
            "meeting_time": "수요일 오후",
            "categoryDetails": {
                "desiredLanguage": "영어",
                "offeredLanguage": "한국어",
                "hobby": "카페, 산책",
                "activityArea": "교내",
            },
            "contactType": "instagram",
            "contactValue": "@itda_global",
            "contactPolicy": "after_approval",
            "status": "open",
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
    return jsonify({"message": "Flask 서버 실행 중", "mongo": mongo_status})


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
    return jsonify({"token": make_auth_token(user_id), "user": serialize_user(user)}), 201


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    user = users.find_one({"email": email})

    if not user or not check_password_hash(user["password_hash"], password):
        return error("이메일 또는 비밀번호가 올바르지 않습니다.", 401)

    session["user_id"] = str(user["_id"])
    return jsonify({"token": make_auth_token(user["_id"]), "user": serialize_user(user)})


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


@app.put("/api/users/me/profile")
@login_required
def update_profile(user):
    payload = request.get_json(silent=True) or {}
    contact_type = (payload.get("contactType") or "").strip()
    if contact_type not in CONTACT_TYPES or not contact_type:
        return error("연락 수단을 선택해주세요.")

    school_email = normalize_school_email(payload.get("schoolEmail") or user.get("schoolEmail"))
    if not valid_school_email(school_email):
        return error(f"학교 이메일은 {SCHOOL_EMAIL_DOMAIN}로 끝나야 합니다.")

    school_email_verified = (
        (
            bool(user.get("schoolEmailVerified"))
            or (bool(payload.get("schoolEmailVerified")) and not user.get("schoolEmailVerificationCode"))
        )
        and school_email == user.get("schoolEmail")
    )
    clean_payload = {
        "name": (payload.get("name") or user.get("name") or "").strip(),
        "major": (payload.get("major") or "").strip(),
        "studentId": (payload.get("studentId") or "").strip(),
        "gender": (payload.get("gender") or "").strip(),
        "profileText": (payload.get("profileText") or "").strip(),
        "schoolEmail": school_email,
        "schoolEmailVerified": school_email_verified,
        "contactType": contact_type,
        "contactValue": (payload.get("contactValue") or "").strip(),
    }

    required = ["name", "major", "studentId", "gender", "profileText", "schoolEmail", "contactValue"]
    if (
        any(not clean_payload[field] for field in required)
        or not clean_payload["schoolEmailVerified"]
    ):
        return error("내 정보와 학교 이메일 인증을 모두 입력해주세요.")

    users.update_one({"_id": user["_id"]}, {"$set": clean_payload})
    updated = users.find_one({"_id": user["_id"]})
    return jsonify({"user": serialize_user(updated)})


@app.post("/api/users/me/school-email/request-code")
@login_required
def request_school_email_code(user):
    payload = request.get_json(silent=True) or {}
    school_email = normalize_school_email(payload.get("schoolEmail"))
    if not valid_school_email(school_email):
        return error(f"학교 이메일은 {SCHOOL_EMAIL_DOMAIN}로 끝나야 합니다.")

    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = now() + timedelta(minutes=SCHOOL_EMAIL_CODE_TTL_MINUTES)
    users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "schoolEmail": school_email,
                "schoolEmailVerified": False,
                "schoolEmailVerificationCode": code,
                "schoolEmailVerificationExpiresAt": expires_at,
                "schoolEmailVerificationRequestedAt": now(),
            }
        },
    )
    updated = users.find_one({"_id": user["_id"]})
    return jsonify(
        {
            "message": "개발용 인증번호가 생성되었습니다.",
            "mockCode": code,
            "expiresAt": expires_at.isoformat(),
            "user": serialize_user(updated),
        }
    )


@app.post("/api/users/me/school-email/verify-code")
@login_required
def verify_school_email_code(user):
    payload = request.get_json(silent=True) or {}
    school_email = normalize_school_email(payload.get("schoolEmail"))
    code = (payload.get("code") or "").strip()

    if school_email != user.get("schoolEmail"):
        return error("인증번호를 요청한 학교 이메일과 일치하지 않습니다.")
    if not code:
        return error("인증번호를 입력해주세요.")
    if user.get("schoolEmailVerificationCode") != code:
        return error("인증번호가 올바르지 않습니다.")

    expires_at = user.get("schoolEmailVerificationExpiresAt")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < now():
        return error("인증번호가 만료되었습니다. 다시 요청해주세요.", 410)

    users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "schoolEmailVerified": True,
                "schoolEmailVerifiedAt": now(),
            },
            "$unset": {
                "schoolEmailVerificationCode": "",
                "schoolEmailVerificationExpiresAt": "",
                "schoolEmailVerificationRequestedAt": "",
            },
        },
    )
    updated = users.find_one({"_id": user["_id"]})
    return jsonify({"message": "학교 이메일 인증이 완료되었습니다.", "user": serialize_user(updated)})


@app.get("/api/posts")
def list_posts():
    category = request.args.get("category")
    status = request.args.get("status")
    keyword = (request.args.get("q") or "").strip()
    query = {}

    if category:
        category = CATEGORY_ALIASES.get(category, category)
        if category not in CATEGORIES:
            return error("지원하지 않는 카테고리입니다.")
        query["category"] = category

    if status:
        if status not in {"open", "closed"}:
            return error("지원하지 않는 모집 상태입니다.")
        query["status"] = status

    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"content": {"$regex": keyword, "$options": "i"}},
            {"keywords": {"$regex": keyword, "$options": "i"}},
        ]

    viewer = current_user()
    found_posts = posts.find(query).sort("created_at", -1)
    return jsonify({"posts": [serialize_post(post, viewer) for post in found_posts]})


@app.post("/api/posts")
@login_required
def create_post(user):
    if not profile_completed(user):
        return error("글 작성 전에 내 정보와 학교 이메일 인증을 입력해주세요.", 403)

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
    return jsonify({"post": serialize_post(post, user)}), 201


@app.get("/api/posts/<post_id>")
def get_post(post_id):
    try:
        post = posts.find_one({"_id": ObjectId(post_id)})
    except Exception:
        return error("잘못된 글 ID입니다.", 400)
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    return jsonify({"post": serialize_post(post, current_user())})


@app.put("/api/posts/<post_id>")
@login_required
def edit_post(user, post_id):
    return error("잇다 MVP에서는 작성 후 수정할 수 없습니다. 삭제 후 다시 작성해주세요.", 403)


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
    applications.delete_many({"post_id": object_id})
    return jsonify({"message": "삭제되었습니다."})


@app.patch("/api/posts/<post_id>/status")
@login_required
def update_post_status(user, post_id):
    try:
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id})
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] != user["_id"]:
        return error("작성자만 상태를 변경할 수 있습니다.", 403)

    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if status not in {"open", "closed"}:
        return error("지원하지 않는 모집 상태입니다.")

    posts.update_one(
        {"_id": object_id},
        {"$set": {"status": status, "closed_at": now() if status == "closed" else None, "updated_at": now()}},
    )
    updated = posts.find_one({"_id": object_id})
    return jsonify({"post": serialize_post(updated, user)})


@app.post("/api/posts/<post_id>/applications")
@login_required
def create_application(user, post_id):
    if not profile_completed(user):
        return error("신청 전에 내 정보와 학교 이메일 인증을 입력해주세요.", 403)

    try:
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id})
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] == user["_id"]:
        return error("본인 글에는 신청할 수 없습니다.", 400)
    if post.get("status") == "closed":
        return error("구인이 완료된 글에는 신청할 수 없습니다.", 400)

    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    if not message:
        return error("신청 댓글을 입력해주세요.")

    created = now()
    result = applications.update_one(
        {"post_id": object_id, "applicant_id": user["_id"]},
        {
            "$setOnInsert": {
                "post_id": object_id,
                "applicant_id": user["_id"],
                "created_at": created,
            },
            "$set": {
                "message": message,
                "status": "pending",
                "updated_at": created,
            },
        },
        upsert=True,
    )
    application = applications.find_one({"post_id": object_id, "applicant_id": user["_id"]})
    return jsonify({"application": serialize_application(application, user)}), 201 if result.upserted_id else 200


@app.get("/api/posts/<post_id>/applications")
@login_required
def list_applications(user, post_id):
    try:
        object_id = ObjectId(post_id)
    except Exception:
        return error("잘못된 글 ID입니다.", 400)

    post = posts.find_one({"_id": object_id})
    if not post:
        return error("글을 찾을 수 없습니다.", 404)

    if post["author_id"] == user["_id"]:
        found = applications.find({"post_id": object_id}).sort("created_at", -1)
    else:
        found = applications.find({"post_id": object_id, "applicant_id": user["_id"]}).sort("created_at", -1)

    return jsonify({"applications": [serialize_application(application, user) for application in found]})


@app.patch("/api/applications/<application_id>")
@login_required
def update_application_status(user, application_id):
    try:
        object_id = ObjectId(application_id)
    except Exception:
        return error("잘못된 신청 ID입니다.", 400)

    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if status not in {"approved", "rejected"}:
        return error("지원하지 않는 신청 상태입니다.")

    application = applications.find_one({"_id": object_id})
    if not application:
        return error("신청을 찾을 수 없습니다.", 404)

    post = posts.find_one({"_id": application["post_id"]})
    if not post:
        return error("글을 찾을 수 없습니다.", 404)
    if post["author_id"] != user["_id"]:
        return error("글쓴이만 신청 상태를 변경할 수 있습니다.", 403)

    applications.update_one({"_id": object_id}, {"$set": {"status": status, "updated_at": now()}})
    updated = applications.find_one({"_id": object_id})
    return jsonify({"application": serialize_application(updated, user)})


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
            "content": f"{keywords} 느낌으로 가볍게 밥 먹을 사람을 찾습니다.\n처음 봐도 부담 없이 이야기하면 좋겠고, 메뉴와 시간은 같이 정해도 좋아요.",
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
