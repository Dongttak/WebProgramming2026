import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  createPost,
  deletePost,
  getCurrentUser,
  getHealth,
  getPost,
  getPosts,
  login,
  logout,
  register,
  requestAiRecommendation,
  updatePost,
} from "./services/api";

const categories = [
  { slug: "team", value: "teamplay", aliases: ["team"], label: "팀플", icon: "TP", description: "과제와 프로젝트 팀원 찾기" },
  { slug: "meal", value: "meal", aliases: [], label: "밥", icon: "ME", description: "점심, 저녁, 번개 식사 메이트 찾기" },
  { slug: "roommate", value: "roommate", aliases: [], label: "룸메", icon: "RM", description: "생활 패턴이 맞는 룸메이트 찾기" },
  { slug: "global", value: "global", aliases: [], label: "외국인 교류", icon: "GL", description: "언어 교환과 문화 교류 친구 찾기" },
];

const contactTypes = [
  { value: "", label: "선택 안 함" },
  { value: "kakao", label: "카카오톡" },
  { value: "instagram", label: "인스타그램" },
  { value: "phone", label: "전화번호" },
  { value: "email", label: "이메일" },
  { value: "openchat", label: "오픈채팅" },
];

const emptyPost = {
  title: "",
  category: "teamplay",
  location: "",
  meeting_time: "",
  keywords: "",
  contactType: "",
  contactValue: "",
  roommateChecklist: {},
  content: "",
};

const roommateFields = [
  { key: "gender", label: "성별", options: ["남자", "여자", "상관없음"] },
  { key: "grade", label: "학번", options: ["22", "23", "24", "25", "26", "상관없음"] },
  { key: "majorGroup", label: "단과", options: ["인문", "사회", "경영경제", "공과", "예체능", "상관없음"] },
  { key: "wakeTime", label: "기상시간", options: ["6", "7", "8", "9", "10", "오후", "맞춰서"] },
  { key: "sleepTime", label: "취침시간", options: ["10", "11", "12", "1", "2", "3", "맞춰서"] },
  { key: "showerTime", label: "샤워시간", options: ["아침", "저녁", "유동적"] },
  { key: "cleaning", label: "청소", options: ["그때그때", "중간중간", "한번에"] },
  { key: "alarm", label: "알람", options: ["잠만보", "중간", "잘들어요"] },
  { key: "smoking", label: "흡연여부", options: ["흡연", "비흡연", "전담"] },
  { key: "drinking", label: "음주빈도", options: ["안마심", "보통", "자주", "매일"] },
  { key: "guest", label: "친구초대", options: ["상관없음", "싫어요", "사전허락"] },
  { key: "study", label: "공부", options: ["기숙사", "도서관", "유동적"] },
  { key: "nightMeal", label: "야식", options: ["안먹음", "별로", "중간", "상관없음"] },
  { key: "homeVisit", label: "본가가는 주기", options: ["주말", "2주", "한달", "방학"] },
  { key: "bug", label: "벌레", options: ["극혐", "못잡음", "중간", "잡음"] },
  { key: "sleepHabit", label: "잠버릇", options: ["없음", "이갈이", "잠꼬대", "코골이"] },
  { key: "mbti", label: "MBTI", options: ["E", "I", "S", "N", "F", "T", "P", "J"] },
  { key: "heat", label: "추위", options: ["별로", "중간", "많이"] },
  { key: "cold", label: "더위", options: ["별로", "중간", "많이"] },
];

function categoryFromSlug(slug) {
  return categories.find((category) => category.slug === slug) ?? null;
}

function categoryLabel(value) {
  return (
    categories.find((category) => category.value === value || category.aliases.includes(value))
      ?.label ?? value
  );
}

function categoryIcon(value) {
  return (
    categories.find((category) => category.value === value || category.aliases.includes(value))
      ?.icon ?? "IT"
  );
}

function contactLabel(value) {
  return contactTypes.find((type) => type.value === value)?.label ?? "연락처";
}

function roommateSummary(checklist = {}) {
  const selected = roommateFields
    .map((field) => {
      const value = checklist?.[field.key];
      return value ? `${field.label} ${value}` : "";
    })
    .filter(Boolean);

  return selected.length > 0 ? selected.slice(0, 5).join(" · ") : "룸메 체크리스트 미작성";
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
  }, [toast.message, onClose]);

  if (!toast.message) return null;

  const tone =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed right-5 top-5 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${tone}`}>
      {toast.message}
    </div>
  );
}

function PageShell({ children, user, onLogout }) {
  const navClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
      isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link className="text-left transition hover:opacity-80 active:scale-[0.99]" to="/">
            <p className="text-2xl font-black text-slate-950">잇다</p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">ITDA</p>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink className={navClass} to="/" end>
              홈
            </NavLink>
            <NavLink className={navClass} to="/boards">
              게시판
            </NavLink>
            <NavLink className={navClass} to="/posts/new">
              글 작성
            </NavLink>
            {user ? (
              <>
                <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  {user.name}
                </span>
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                  onClick={onLogout}
                  type="button"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavLink className={navClass} to="/login">
                  로그인
                </NavLink>
                <NavLink className={navClass} to="/signup">
                  회원가입
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

function HomePage({ serverStatus, user }) {
  return (
    <section className="space-y-8">
      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <span className="inline-flex rounded-md bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
            ITDA Matching MVP
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            캠퍼스 연결을 더 쉽게
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            팀플, 밥, 룸메, 외국인 교류까지 목적별 게시판에서 필요한 사람을 빠르게 찾는
            대학생 매칭 서비스입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
              to="/boards"
            >
              전체 게시판 보기
            </Link>
            <Link
              className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.98]"
              to={user ? "/posts/new" : "/login"}
            >
              매칭 글 작성
            </Link>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500">서버 상태</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{serverStatus}</p>
          <div className="mt-5 grid gap-3">
            {categories.map((category) => (
              <Link
                className="group rounded-md border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md active:scale-[0.99]"
                key={category.slug}
                to={`/boards/${category.slug}`}
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-black text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white">
                    {category.icon}
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">{category.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                  </div>
                </div>
              </Link>
            ))}
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-4">
              <p className="font-bold text-slate-400">데이트</p>
              <p className="mt-1 text-sm text-slate-400">확장 기능 후보로만 남겨둠</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthPage({ mode, loading, onSubmit }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "", major: "" });

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form, mode);
  }

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">{isRegister ? "회원가입" : "로그인"}</h2>
      <p className="mt-2 text-sm text-slate-500">과제 시연용으로 간단히 계정을 만들 수 있습니다.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {isRegister && (
          <>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">이름</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500" name="name" onChange={handleChange} required value={form.name} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">학과</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500" name="major" onChange={handleChange} placeholder="예: 컴퓨터공학과" value={form.major} />
            </label>
          </>
        )}
        <label className="block">
          <span className="text-sm font-medium text-slate-700">이메일</span>
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500" name="email" onChange={handleChange} required type="email" value={form.email} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">비밀번호</span>
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500" minLength={4} name="password" onChange={handleChange} required type="password" value={form.password} />
        </label>
        <button className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] disabled:bg-slate-400" disabled={loading} type="submit">
          {loading ? "처리 중..." : isRegister ? "가입하기" : "로그인하기"}
        </button>
      </form>
      <Link className="mt-4 block w-full text-center text-sm font-medium text-sky-700 hover:text-sky-900" to={isRegister ? "/login" : "/signup"}>
        {isRegister ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 회원가입"}
      </Link>
    </section>
  );
}

function BoardTabs({ activeSlug }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <NavLink
        className={({ isActive }) =>
          `rounded-lg border p-4 transition hover:-translate-y-1 hover:shadow-md active:scale-[0.99] ${
            isActive && !activeSlug ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800"
          }`
        }
        to="/boards"
        end
      >
        <span className="text-xs font-black">ALL</span>
        <p className="mt-2 font-bold">전체</p>
      </NavLink>
      {categories.map((category) => (
        <NavLink
          className={({ isActive }) =>
            `rounded-lg border p-4 transition hover:-translate-y-1 hover:shadow-md active:scale-[0.99] ${
              isActive ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-800"
            }`
          }
          key={category.slug}
          to={`/boards/${category.slug}`}
        >
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black">{category.icon}</span>
          <p className="mt-3 font-bold">{category.label}</p>
        </NavLink>
      ))}
    </div>
  );
}

function BoardPage({ user }) {
  const { boardSlug } = useParams();
  const navigate = useNavigate();
  const activeCategory = categoryFromSlug(boardSlug);
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getPosts({
          category: activeCategory?.value ?? "",
          q,
        });
        if (alive) setPosts(data.posts);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [activeCategory?.value, q]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            {activeCategory ? `${activeCategory.label} 게시판` : "전체 게시판"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">카테고리별로 매칭 글을 둘러보고 연락해보세요.</p>
        </div>
        <Link
          className="rounded-md bg-sky-600 px-4 py-2 text-center font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98]"
          to={user ? "/posts/new" : "/login"}
        >
          새 글 작성
        </Link>
      </div>

      <BoardTabs activeSlug={boardSlug} />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500"
          onChange={(event) => setQ(event.target.value)}
          placeholder="제목, 내용, 키워드 검색"
          value={q}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">아직 조건에 맞는 글이 없습니다.</div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <button
              className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md active:scale-[0.99]"
              key={post.id}
              onClick={() => navigate(`/posts/${post.id}`)}
              type="button"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 transition group-hover:bg-sky-100 group-hover:text-sky-700">
                    {categoryIcon(post.category)} · {categoryLabel(post.category)}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-slate-950">{post.title}</h3>
                </div>
                <p className="text-sm text-slate-400">{formatDate(post.created_at)}</p>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{post.content}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>작성자 {post.author_name}</span>
                {post.location && <span>장소 {post.location}</span>}
                {post.meeting_time && <span>시간 {post.meeting_time}</span>}
                <span>{post.contactValue ? `${contactLabel(post.contactType)} 가능` : "연락처 없음"}</span>
              </div>
              {post.category === "roommate" && (
                <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium leading-5 text-emerald-800">
                  {roommateSummary(post.roommateChecklist)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function PostFormPage({ user, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyPost);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (user || !isEdit) return;
    navigate("/login");
  }, [isEdit, navigate, user]);

  useEffect(() => {
    let alive = true;
    async function loadPost() {
      if (!isEdit) {
        setForm(emptyPost);
        return;
      }
      setLoading(true);
      try {
        const data = await getPost(id);
        if (alive) {
          setForm({
            ...emptyPost,
            ...data.post,
            category: data.post.category === "team" ? "teamplay" : data.post.category,
            contactType: data.post.contactType ?? "",
            contactValue: data.post.contactValue ?? "",
            roommateChecklist: data.post.roommateChecklist ?? {},
          });
        }
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadPost();
    return () => {
      alive = false;
    };
  }, [id, isEdit, showToast]);

  if (!user) return <Navigate to="/login" replace />;

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleRoommateChoice(key, value) {
    setForm((prev) => ({
      ...prev,
      roommateChecklist: {
        ...(prev.roommateChecklist ?? {}),
        [key]: prev.roommateChecklist?.[key] === value ? "" : value,
      },
    }));
  }

  async function handleRecommend() {
    setAiLoading(true);
    try {
      const data = await requestAiRecommendation({
        category: form.category,
        keywords: form.keywords,
      });
      setForm((prev) => ({ ...prev, title: data.title, content: data.content }));
      showToast("AI 추천 예시를 입력했습니다.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = isEdit ? await updatePost(id, form) : await createPost(form);
      showToast(isEdit ? "글이 수정되었습니다." : "글이 작성되었습니다.");
      navigate(`/posts/${data.post.id}`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{isEdit ? "매칭 글 수정" : "매칭 글 작성"}</h2>
          <p className="mt-1 text-sm text-slate-500">연락 수단을 남기면 팀원이 바로 연락할 수 있습니다.</p>
        </div>
        <button className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" onClick={() => navigate(-1)} type="button">
          취소
        </button>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">카테고리</span>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="category" onChange={handleChange} value={form.category}>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">키워드</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="keywords" onChange={handleChange} placeholder="예: React, 발표, 화요일 저녁" value={form.keywords} />
          </label>
        </div>

        {form.category === "roommate" && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-700">룸메 체크리스트</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">생활 패턴을 골라주세요</h3>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                선택한 항목은 다시 누르면 해제
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roommateFields.map((field) => (
                <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm" key={field.key}>
                  <p className="font-bold text-slate-900">{field.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {field.options.map((option) => {
                      const selected = form.roommateChecklist?.[field.key] === option;
                      return (
                        <button
                          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-[0.97] ${
                            selected
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                          key={option}
                          onClick={() => handleRoommateChoice(field.key, option)}
                          type="button"
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <button className="w-fit rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-400" disabled={aiLoading} onClick={handleRecommend} type="button">
          {aiLoading ? "추천 생성 중..." : "AI 추천 받기"}
        </button>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">제목</span>
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="title" onChange={handleChange} required value={form.title} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">장소</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="location" onChange={handleChange} placeholder="예: 중앙도서관, 학생식당" value={form.location} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">희망 시간</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="meeting_time" onChange={handleChange} placeholder="예: 월/수 18시 이후" value={form.meeting_time} />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">연락 수단</span>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="contactType" onChange={handleChange} value={form.contactType}>
              {contactTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">연락처</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="contactValue" onChange={handleChange} placeholder="예: 오픈채팅 링크, 인스타 ID, 이메일" value={form.contactValue} />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">내용</span>
          <textarea className="mt-1 min-h-44 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="content" onChange={handleChange} required value={form.content} />
        </label>

        <button className="rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] disabled:bg-slate-400" disabled={loading} type="submit">
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </form>
    </section>
  );
}

function PostDetailPage({ user, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getPost(id);
        if (alive) setPost(data.post);
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id, showToast]);

  async function handleDelete() {
    if (!post || !window.confirm("정말 삭제할까요?")) return;
    try {
      await deletePost(post.id);
      showToast("글이 삭제되었습니다.");
      navigate("/boards");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  if (loading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">불러오는 중...</section>;
  }

  if (!post) {
    return <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">글을 찾을 수 없습니다.</section>;
  }

  const isOwner = user && post.author_id === user.id;
  const hasContact = Boolean(post.contactType && post.contactValue);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <button className="text-sm font-semibold text-sky-700 transition hover:text-sky-900" onClick={() => navigate(-1)} type="button">
        목록으로 돌아가기
      </button>
      <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
            {categoryIcon(post.category)} · {categoryLabel(post.category)}
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-950">{post.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{post.author_name} · {formatDate(post.created_at)}</p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Link className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" to={`/posts/${post.id}/edit`}>
              수정
            </Link>
            <button className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]" onClick={handleDelete} type="button">
              삭제
            </button>
          </div>
        )}
      </div>

      <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div>
          <dt className="font-semibold text-slate-500">장소</dt>
          <dd className="mt-1 text-slate-950">{post.location || "협의"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">희망 시간</dt>
          <dd className="mt-1 text-slate-950">{post.meeting_time || "협의"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">키워드</dt>
          <dd className="mt-1 text-slate-950">{post.keywords || "없음"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">연락 수단</dt>
          <dd className={`mt-1 font-bold ${hasContact ? "text-sky-700" : "text-slate-400"}`}>
            {hasContact ? `${contactLabel(post.contactType)} · ${post.contactValue}` : "연락처 없음"}
          </dd>
        </div>
      </dl>

      {post.category === "roommate" && (
        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-700">ROOMMATE CHECKLIST</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">룸메 생활 패턴</h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
              {roommateSummary(post.roommateChecklist)}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roommateFields.map((field) => {
              const value = post.roommateChecklist?.[field.key];
              return (
                <div className="rounded-md border border-emerald-100 bg-white px-4 py-3" key={field.key}>
                  <p className="text-xs font-bold text-slate-500">{field.label}</p>
                  <p className={`mt-1 font-bold ${value ? "text-slate-950" : "text-slate-400"}`}>
                    {value || "미선택"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-700">{post.content}</p>
    </section>
  );
}

function AppRoutes({ user, loading, serverStatus, onAuthSubmit, onLogout, showToast }) {
  return (
    <PageShell user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<HomePage serverStatus={serverStatus} user={user} />} />
        <Route path="/login" element={<AuthPage loading={loading} mode="login" onSubmit={onAuthSubmit} />} />
        <Route path="/signup" element={<AuthPage loading={loading} mode="register" onSubmit={onAuthSubmit} />} />
        <Route path="/boards" element={<BoardPage user={user} />} />
        <Route path="/boards/:boardSlug" element={<BoardPage user={user} />} />
        <Route path="/posts/new" element={<PostFormPage showToast={showToast} user={user} />} />
        <Route path="/posts/:id" element={<PostDetailPage showToast={showToast} user={user} />} />
        <Route path="/posts/:id/edit" element={<PostFormPage showToast={showToast} user={user} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </PageShell>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [serverStatus, setServerStatus] = useState("확인 중...");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = useMemo(
    () => (message, type = "success") => setToast({ message, type }),
    [],
  );

  useEffect(() => {
    async function boot() {
      try {
        const data = await getHealth();
        setServerStatus(data.message);
      } catch {
        setServerStatus("Flask 서버 연결 실패");
      }
      try {
        const data = await getCurrentUser();
        setUser(data.user);
      } catch {
        setUser(null);
      }
    }
    boot();
  }, []);

  async function handleAuthSubmit(form, mode) {
    setLoading(true);
    try {
      const data = mode === "register" ? await register(form) : await login(form);
      setUser(data.user);
      showToast(mode === "register" ? "회원가입이 완료되었습니다." : "로그인되었습니다.");
      navigate("/boards");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      showToast("로그아웃되었습니다.");
      navigate("/");
    }
  }

  return (
    <>
      <Toast toast={toast} onClose={() => setToast({ message: "", type: "success" })} />
      <AppRoutes
        loading={loading}
        onAuthSubmit={handleAuthSubmit}
        onLogout={handleLogout}
        serverStatus={serverStatus}
        showToast={showToast}
        user={user}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
