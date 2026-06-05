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
  useSearchParams,
} from "react-router-dom";
import {
  createApplication,
  createPost,
  deletePost,
  getApplications,
  getCurrentUser,
  getHealth,
  getPost,
  getPosts,
  login,
  logout,
  register,
  requestAiRecommendation,
  requestSchoolEmailCode,
  updateApplicationStatus,
  updateProfile,
  updatePostStatus,
  verifySchoolEmailCode,
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
  meeting_time: "",
  keywords: "",
  categoryDetails: {},
  contactType: "",
  contactValue: "",
  roommateChecklist: {},
  content: "",
};

const roommateFields = [
  { key: "gender", label: "성별", options: ["남자", "여자"] },
  { key: "grade", label: "학번", options: ["22", "23", "24", "25", "26"] },
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
  { key: "mbtiEI", label: "MBTI E/I", options: ["E", "I"] },
  { key: "mbtiSN", label: "MBTI S/N", options: ["S", "N"] },
  { key: "mbtiTF", label: "MBTI T/F", options: ["T", "F"] },
  { key: "mbtiJP", label: "MBTI J/P", options: ["J", "P"] },
  { key: "heat", label: "추위", options: ["별로", "중간", "많이"] },
  { key: "cold", label: "더위", options: ["별로", "중간", "많이"] },
];

const categoryDetailFields = {
  teamplay: [
    { key: "activityType", label: "활동 종류", type: "select", options: ["수업명", "비교과 활동", "대외활동"] },
    { key: "activityName", label: "활동명", placeholder: "예: 웹프로그래밍, 해커톤, 공모전" },
    { key: "activityDetail", label: "활동 내역", placeholder: "예: React 프론트엔드, 발표 자료 제작" },
  ],
  meal: [
    { key: "menu", label: "메뉴", placeholder: "예: 학식, 마라탕, 파스타" },
    { key: "drinking", label: "음주 여부", type: "select", options: ["안 마셔요", "가볍게", "상관없음"] },
  ],
  global: [
    { key: "desiredLanguage", label: "희망 언어", placeholder: "예: 영어, 일본어, 중국어" },
    { key: "offeredLanguage", label: "제공 언어", placeholder: "예: 한국어, 영어" },
    { key: "hobby", label: "취미", placeholder: "예: 카페, 산책, 영화" },
    { key: "activityArea", label: "활동 가능 지역", placeholder: "예: 교내, 건대입구, 온라인" },
  ],
};

function categoryFromSlug(slug) {
  return categories.find((category) => category.slug === slug) ?? null;
}

function categoryLabel(value) {
  return categories.find((category) => category.value === value || category.aliases.includes(value))?.label ?? value;
}

function categoryIcon(value) {
  return categories.find((category) => category.value === value || category.aliases.includes(value))?.icon ?? "IT";
}

function contactLabel(value) {
  return contactTypes.find((type) => type.value === value)?.label ?? "연락처";
}

function profileCompleted(user) {
  return Boolean(
      user?.studentId &&
      user?.gender &&
      user?.profileText &&
      user?.schoolEmail &&
      user?.schoolEmailVerified &&
      user?.contactType &&
      user?.contactValue,
  );
}

function splitTags(value = "") {
  return value
    .replaceAll("#", ",")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function roommateSummary(checklist = {}) {
  const mbti =
    checklist.mbti ||
    [checklist.mbtiEI, checklist.mbtiSN, checklist.mbtiTF, checklist.mbtiJP]
      .filter(Boolean)
      .join("");
  const selected = roommateFields
    .filter((field) => !field.key.startsWith("mbti"))
    .map((field) => {
      const value = checklist?.[field.key];
      return value ? `${field.label} ${value}` : "";
    })
    .filter(Boolean);

  const summary = mbti.length === 4 ? [`MBTI ${mbti}`, ...selected] : selected;
  return summary.length > 0 ? summary.slice(0, 5).join(" · ") : "룸메 체크리스트 미작성";
}

function categoryDetailSummary(post) {
  const details = post?.categoryDetails ?? {};
  if (post?.category === "teamplay") {
    return [details.activityType, details.activityName, details.activityDetail].filter(Boolean).join(" · ");
  }
  if (post?.category === "meal") {
    return [details.menu, details.drinking].filter(Boolean).join(" · ");
  }
  if (post?.category === "global") {
    return [
      details.desiredLanguage && `희망 ${details.desiredLanguage}`,
      details.offeredLanguage && `제공 ${details.offeredLanguage}`,
      details.hobby,
      details.activityArea,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

function statusLabel(status) {
  return status === "closed" ? "구인 완료" : "구인 중";
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

  return <div className={`fixed right-5 top-5 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${tone}`}>{toast.message}</div>;
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
            <NavLink className={navClass} to="/" end>홈</NavLink>
            <NavLink className={navClass} to="/boards">게시판</NavLink>
            <NavLink className={navClass} to="/posts/new">글 작성</NavLink>
            {user && <NavLink className={navClass} to="/profile">내 정보</NavLink>}
            {user ? (
              <>
                <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">{user.name}</span>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" onClick={onLogout} type="button">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavLink className={navClass} to="/login">로그인</NavLink>
                <NavLink className={navClass} to="/signup">회원가입</NavLink>
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
          <span className="inline-flex rounded-md bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">ITDA Matching MVP</span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">캠퍼스 연결을 더 쉽게</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            팀플, 밥, 룸메, 외국인 교류까지 목적별 게시판에서 필요한 사람을 빠르게 찾는 대학생 매칭 서비스입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]" to="/boards">전체 게시판 보기</Link>
            <Link className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.98]" to={user ? "/posts/new" : "/login"}>매칭 글 작성</Link>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500">서버 상태</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{serverStatus}</p>
          <div className="mt-5 grid gap-3">
            {categories.map((category) => (
              <Link className="group rounded-md border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md active:scale-[0.99]" key={category.slug} to={`/boards/${category.slug}`}>
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-black text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white">{category.icon}</span>
                  <div>
                    <p className="font-bold text-slate-950">{category.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{category.description}</p>
                  </div>
                </div>
              </Link>
            ))}
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
      <NavLink className={({ isActive }) => `rounded-lg border p-4 transition hover:-translate-y-1 hover:shadow-md active:scale-[0.99] ${isActive && !activeSlug ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800"}`} to="/boards" end>
        <span className="text-xs font-black">ALL</span>
        <p className="mt-2 font-bold">전체</p>
      </NavLink>
      {categories.map((category) => (
        <NavLink className={({ isActive }) => `rounded-lg border p-4 transition hover:-translate-y-1 hover:shadow-md active:scale-[0.99] ${isActive ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-800"}`} key={category.slug} to={`/boards/${category.slug}`}>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = categoryFromSlug(boardSlug);
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "open");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setStatusFilter(searchParams.get("status") ?? "open");
  }, [searchParams]);

  function updateBoardParams(nextQ = q, nextStatus = statusFilter) {
    setQ(nextQ);
    setStatusFilter(nextStatus);
    const nextParams = {};
    if (nextQ) nextParams.q = nextQ;
    if (nextStatus !== "open") nextParams.status = nextStatus;
    setSearchParams(nextParams);
  }

  function updateSearch(value) {
    updateBoardParams(value, statusFilter);
  }

  function updateStatus(value) {
    updateBoardParams(q, value);
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getPosts({
          category: activeCategory?.value ?? "",
          q,
          status: statusFilter === "all" ? "" : statusFilter,
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
  }, [activeCategory?.value, q, statusFilter]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{activeCategory ? `${activeCategory.label} 게시판` : "전체 게시판"}</h2>
          <p className="mt-1 text-sm text-slate-500">카테고리별로 매칭 글을 둘러보고 연락해보세요.</p>
        </div>
        <Link className="rounded-md bg-sky-600 px-4 py-2 text-center font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98]" to={user ? "/posts/new" : "/login"}>새 글 작성</Link>
      </div>

      <BoardTabs activeSlug={boardSlug} />

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
        <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500" onChange={(event) => updateSearch(event.target.value)} placeholder="제목, 내용, 키워드 검색" value={q} />
        <div className="grid grid-cols-3 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm font-bold">
          {[
            ["open", "구인 중"],
            ["closed", "구인 완료"],
            ["all", "전체"],
          ].map(([value, label]) => (
            <button
              className={`rounded px-3 py-2 transition active:scale-[0.98] ${
                statusFilter === value ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
              }`}
              key={value}
              onClick={() => updateStatus(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          {statusFilter === "closed" ? "아직 구인 완료된 글이 없습니다." : "아직 조건에 맞는 글이 없습니다."}
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <article
              className={`group rounded-lg border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md active:scale-[0.99] ${
                post.status === "closed"
                  ? "border-slate-200 bg-slate-50 opacity-85 hover:border-slate-300"
                  : "border-slate-200 bg-white hover:border-sky-300"
              }`}
              key={post.id}
              onClick={() => navigate(`/posts/${post.id}`)}
              onKeyDown={(event) => { if (event.key === "Enter") navigate(`/posts/${post.id}`); }}
              role="button"
              tabIndex={0}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 transition group-hover:bg-sky-100 group-hover:text-sky-700">{categoryIcon(post.category)} · {categoryLabel(post.category)}</span>
                  <h3 className="mt-3 text-xl font-bold text-slate-950">{post.title}</h3>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${post.status === "closed" ? "bg-slate-200 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                    {statusLabel(post.status)}
                  </span>
                  <p className="text-sm text-slate-400">{formatDate(post.created_at)}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{post.content}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>작성자 {post.author_name}</span>
                {post.meeting_time && <span>시간 {post.meeting_time}</span>}
                <span className="font-semibold text-sky-700">연락처 승인 후 공개</span>
              </div>
              {categoryDetailSummary(post) && (
                <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700">
                  {categoryDetailSummary(post)}
                </div>
              )}
              {splitTags(post.keywords).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {splitTags(post.keywords).map((tag) => (
                    <button className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-sky-100 hover:text-sky-700" key={tag} onClick={(event) => { event.stopPropagation(); updateSearch(tag); }} type="button">
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              {post.category === "roommate" && (
                <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium leading-5 text-emerald-800">{roommateSummary(post.roommateChecklist)}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PostFormPage({ authReady, user, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyPost);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  if (!authReady) {
    return <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">로그인 상태를 확인하는 중...</section>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (isEdit) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="text-2xl font-black text-slate-950">작성 후 수정할 수 없습니다</h2>
        <p className="mt-3 text-sm leading-6 text-amber-800">잇다는 모집 글의 신뢰도를 위해 작성 후 수정 기능을 막아두었습니다. 내용 변경이 필요하면 기존 글을 삭제한 뒤 다시 작성해주세요.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white" to={`/posts/${id}`}>글로 돌아가기</Link>
          <Link className="rounded-md border border-amber-300 bg-white px-4 py-2 font-semibold text-amber-800" to="/posts/new">새 글 작성</Link>
        </div>
      </section>
    );
  }

  if (!profileCompleted(user)) {
    return (
      <section className="rounded-lg border border-sky-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">내 정보 입력이 필요합니다</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">글 작성과 신청 기능은 학교 이메일 인증, 기본 프로필, 승인 후 공개할 연락처를 입력한 뒤 사용할 수 있습니다.</p>
        <Link className="mt-5 inline-flex rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700" to="/profile">내 정보 입력하기</Link>
      </section>
    );
  }

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

  function handleCategoryDetailChange(key, value) {
    setForm((prev) => ({
      ...prev,
      categoryDetails: {
        ...(prev.categoryDetails ?? {}),
        [key]: value,
      },
    }));
  }

  async function handleRecommend() {
    setAiLoading(true);
    try {
      const data = await requestAiRecommendation({ category: form.category, keywords: form.keywords });
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
      const data = await createPost(form);
      showToast("글이 작성되었습니다.");
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
          <h2 className="text-2xl font-bold text-slate-950">매칭 글 작성</h2>
          <p className="mt-1 text-sm text-slate-500">연락처는 공개되지 않고 신청 승인 후에만 서로 확인할 수 있습니다.</p>
        </div>
        <button className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" onClick={() => navigate(-1)} type="button">취소</button>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">작성 후에는 수정할 수 없습니다. 카테고리별 정보, 태그, 연락처를 꼭 확인한 뒤 등록해주세요.</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">카테고리</span>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="category" onChange={handleChange} value={form.category}>
              {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">키워드</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="keywords" onChange={handleChange} placeholder="예: React, 발표, 화요일 저녁" required value={form.keywords} />
          </label>
        </div>

        {categoryDetailFields[form.category] && (
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-black text-sky-700">카테고리별 정보</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {categoryDetailFields[form.category].map((field) => (
                <label className="block" key={field.key}>
                  <span className="text-sm font-medium text-slate-700">{field.label}</span>
                  {field.type === "select" ? (
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                      onChange={(event) => handleCategoryDetailChange(field.key, event.target.value)}
                      required
                      value={form.categoryDetails?.[field.key] ?? ""}
                    >
                      <option value="">선택</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
                      onChange={(event) => handleCategoryDetailChange(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      required
                      value={form.categoryDetails?.[field.key] ?? ""}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        )}

        {form.category === "roommate" && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-700">룸메 체크리스트</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">생활 패턴을 골라주세요</h3>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">선택한 항목은 다시 누르면 해제</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roommateFields.map((field) => (
                <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm" key={field.key}>
                  <p className="font-bold text-slate-900">{field.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {field.options.map((option) => {
                      const selected = form.roommateChecklist?.[field.key] === option;
                      return (
                        <button className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-[0.97] ${selected ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`} key={option} onClick={() => handleRoommateChoice(field.key, option)} type="button">
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

        <div className="grid gap-4 md:grid-cols-1">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">희망 시간</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="meeting_time" onChange={handleChange} placeholder="예: 월/수 18시 이후" required value={form.meeting_time} />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">연락 수단</span>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="contactType" onChange={handleChange} required value={form.contactType}>
              {contactTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">연락처</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="contactValue" onChange={handleChange} placeholder="승인된 사람에게만 공개됩니다" required value={form.contactValue} />
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
  const [applicationsList, setApplicationsList] = useState([]);
  const [applicationMessage, setApplicationMessage] = useState("");
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

  useEffect(() => {
    let alive = true;
    async function loadApplications() {
      if (!user || !post) {
        setApplicationsList([]);
        return;
      }
      try {
        const data = await getApplications(post.id);
        if (alive) setApplicationsList(data.applications);
      } catch {
        if (alive) setApplicationsList([]);
      }
    }
    loadApplications();
    return () => {
      alive = false;
    };
  }, [post, user]);

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

  async function handleApply(event) {
    event.preventDefault();
    if (!profileCompleted(user)) {
      showToast("신청 전에 내 정보를 먼저 입력해주세요.", "error");
      navigate("/profile");
      return;
    }
    try {
      const data = await createApplication(post.id, { message: applicationMessage });
      setApplicationsList((prev) => [data.application, ...prev.filter((item) => item.id !== data.application.id)]);
      setApplicationMessage("");
      showToast("신청 댓글을 보냈습니다. 글쓴이 승인 후 연락처를 확인할 수 있습니다.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleApplicationStatus(applicationId, status) {
    try {
      const data = await updateApplicationStatus(applicationId, status);
      setApplicationsList((prev) => prev.map((item) => (item.id === applicationId ? data.application : item)));
      showToast(status === "approved" ? "신청을 승인했습니다." : "신청을 거절했습니다.");
      const refreshed = await getPost(post.id);
      setPost(refreshed.post);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handlePostStatus(status) {
    try {
      const data = await updatePostStatus(post.id, status);
      setPost(data.post);
      showToast(status === "closed" ? "구인 완료로 변경했습니다." : "구인 중으로 변경했습니다.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  if (loading) return <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">불러오는 중...</section>;
  if (!post) return <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">글을 찾을 수 없습니다.</section>;

  const isOwner = user && post.author_id === user.id;
  const hasContact = Boolean(post.contactType && post.contactValue);
  const myApplication = applicationsList.find((application) => application.applicantId === user?.id);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <button className="text-sm font-semibold text-sky-700 transition hover:text-sky-900" onClick={() => navigate(-1)} type="button">목록으로 돌아가기</button>
      <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{categoryIcon(post.category)} · {categoryLabel(post.category)}</span>
          <h2 className="mt-4 text-3xl font-black text-slate-950">{post.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{post.author_name} · {formatDate(post.created_at)}</p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">수정 불가</span>
            <button
              className="rounded-md border border-emerald-300 bg-white px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-50 active:scale-[0.98]"
              onClick={() => handlePostStatus(post.status === "closed" ? "open" : "closed")}
              type="button"
            >
              {post.status === "closed" ? "구인 재개" : "구인 완료"}
            </button>
            <button className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]" onClick={handleDelete} type="button">삭제</button>
          </div>
        )}
      </div>

      <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div><dt className="font-semibold text-slate-500">모집 상태</dt><dd className={`mt-1 font-bold ${post.status === "closed" ? "text-slate-500" : "text-emerald-700"}`}>{statusLabel(post.status)}</dd></div>
        <div><dt className="font-semibold text-slate-500">희망 시간</dt><dd className="mt-1 text-slate-950">{post.meeting_time || "협의"}</dd></div>
        <div><dt className="font-semibold text-slate-500">키워드</dt><dd className="mt-1 text-slate-950">{post.keywords || "없음"}</dd></div>
        <div>
          <dt className="font-semibold text-slate-500">연락 수단</dt>
          <dd className={`mt-1 font-bold ${hasContact ? "text-sky-700" : "text-slate-400"}`}>{hasContact ? `${contactLabel(post.contactType)} · ${post.contactValue}` : "승인 후 공개"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {splitTags(post.keywords).map((tag) => (
          <Link className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-sky-100 hover:text-sky-700" key={tag} to={`/boards?q=${encodeURIComponent(tag)}`}>#{tag}</Link>
        ))}
      </div>

      {categoryDetailSummary(post) && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-bold text-slate-950">카테고리 정보:</span> {categoryDetailSummary(post)}
        </div>
      )}

      {post.category === "roommate" && (
        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-700">ROOMMATE CHECKLIST</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">룸메 생활 패턴</h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">{roommateSummary(post.roommateChecklist)}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roommateFields.map((field) => {
              const value = post.roommateChecklist?.[field.key];
              return (
                <div className="rounded-md border border-emerald-100 bg-white px-4 py-3" key={field.key}>
                  <p className="text-xs font-bold text-slate-500">{field.label}</p>
                  <p className={`mt-1 font-bold ${value ? "text-slate-950" : "text-slate-400"}`}>{value || "미선택"}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-700">{post.content}</p>

      {!isOwner && (
        <section className="mt-6 rounded-lg border border-sky-200 bg-white p-5">
          <h3 className="text-xl font-black text-slate-950">신청 댓글</h3>
          <p className="mt-1 text-sm text-slate-500">글쓴이만 신청자의 프로필과 연락처를 확인할 수 있고, 승인 후 서로 연락처가 공개됩니다.</p>
          {post.status === "closed" ? (
            <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-500">구인이 완료된 글입니다.</p>
          ) : !user ? (
            <Link className="mt-4 inline-flex rounded-md bg-sky-600 px-4 py-2 font-semibold text-white" to="/login">로그인 후 신청하기</Link>
          ) : myApplication ? (
            <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-bold">내 신청 상태: {myApplication.status}</p>
              <p className="mt-2 whitespace-pre-wrap">{myApplication.message}</p>
              {myApplication.ownerContact && <p className="mt-3 font-bold text-sky-700">글쓴이 연락처: {contactLabel(myApplication.ownerContact.contactType)} · {myApplication.ownerContact.contactValue}</p>}
            </div>
          ) : (
            <form className="mt-4 grid gap-3" onSubmit={handleApply}>
              <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-slate-950" onChange={(event) => setApplicationMessage(event.target.value)} placeholder="간단한 자기소개와 신청 이유를 남겨주세요." required value={applicationMessage} />
              <button className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700" type="submit">신청 댓글 남기기</button>
            </form>
          )}
        </section>
      )}

      {isOwner && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-black text-slate-950">신청자 관리</h3>
          <p className="mt-1 text-sm text-slate-500">글쓴이만 신청자 프로필과 연락처를 확인할 수 있습니다.</p>
          {applicationsList.length === 0 ? (
            <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-500">아직 신청 댓글이 없습니다.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {applicationsList.map((application) => (
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={application.id}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black text-slate-950">{application.applicant?.name || "신청자"}</p>
                      <p className="mt-1 text-sm text-slate-600">{application.applicant?.major} · {application.applicant?.studentId} · {application.applicant?.schoolEmail}</p>
                      <p className="mt-2 text-sm text-slate-700">{application.applicant?.profileText}</p>
                      <p className="mt-2 text-sm font-bold text-sky-700">연락처: {contactLabel(application.applicant?.contactType)} · {application.applicant?.contactValue}</p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{application.status}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-slate-700">{application.message}</p>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300" disabled={application.status === "approved"} onClick={() => handleApplicationStatus(application.id, "approved")} type="button">승인</button>
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:bg-slate-100" disabled={application.status === "rejected"} onClick={() => handleApplicationStatus(application.id, "rejected")} type="button">거절</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function ProfilePage({ authReady, user, onProfileSaved, showToast }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    major: "",
    studentId: "",
    gender: "",
    profileText: "",
    schoolEmail: "",
    contactType: "",
    contactValue: "",
  });
  const [saving, setSaving] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [mockCode, setMockCode] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      major: user.major ?? "",
      studentId: user.studentId ?? "",
      gender: user.gender ?? "",
      profileText: user.profileText ?? "",
      schoolEmail: user.schoolEmail ?? "",
      contactType: user.contactType ?? "",
      contactValue: user.contactValue ?? "",
    });
  }, [user]);

  if (!authReady) return <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">로그인 상태를 확인하는 중...</section>;
  if (!user) return <Navigate to="/login" replace />;

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.schoolEmailVerified || user.schoolEmail !== form.schoolEmail) {
      showToast("학교 이메일 인증번호 확인까지 완료해주세요.", "error");
      return;
    }
    setSaving(true);
    try {
      const data = await updateProfile({ ...form, schoolEmailVerified: true });
      onProfileSaved(data.user);
      showToast("내 정보가 저장되었습니다.");
      navigate("/boards");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestSchoolEmailCode() {
    setEmailLoading(true);
    try {
      const data = await requestSchoolEmailCode({ schoolEmail: form.schoolEmail });
      onProfileSaved({ ...user, ...form, schoolEmail: data.user.schoolEmail, schoolEmailVerified: false });
      setMockCode(data.mockCode);
      setEmailCode("");
      showToast("개발용 학교 이메일 인증번호가 생성되었습니다.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleVerifySchoolEmailCode() {
    setEmailLoading(true);
    try {
      const data = await verifySchoolEmailCode({ schoolEmail: form.schoolEmail, code: emailCode });
      onProfileSaved({ ...user, ...form, schoolEmail: data.user.schoolEmail, schoolEmailVerified: true });
      setMockCode("");
      setEmailCode("");
      showToast("학교 이메일 인증이 완료되었습니다.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-black text-slate-950">내 정보</h2>
        <p className="mt-1 text-sm text-slate-500">글 작성과 신청 전에 프로필과 학교 이메일 인증을 입력해주세요.</p>
      </div>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block"><span className="text-sm font-medium text-slate-700">이름</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="name" onChange={handleChange} required value={form.name} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">학과</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="major" onChange={handleChange} required value={form.major} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">학번</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="studentId" onChange={handleChange} placeholder="예: 20240001" required value={form.studentId} /></label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">성별</span>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="gender" onChange={handleChange} required value={form.gender}>
              <option value="">선택</option>
              <option value="남자">남자</option>
              <option value="여자">여자</option>
              <option value="공개 안 함">공개 안 함</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">프로필 소개</span>
          <textarea className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="profileText" onChange={handleChange} placeholder="댓글/신청 시 글쓴이에게 보여줄 소개" required value={form.profileText} />
        </label>
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">학교 이메일 인증</p>
              <p className="mt-1 text-sm text-slate-600">세종대 이메일 주소인 <span className="font-bold">@sju.ac.kr</span>만 인증할 수 있습니다.</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${user?.schoolEmailVerified ? "bg-emerald-600 text-white" : "bg-white text-emerald-700"}`}>{user?.schoolEmailVerified ? "인증 완료" : "인증 필요"}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">학교 이메일</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="schoolEmail" onChange={handleChange} placeholder="student@sju.ac.kr" required type="email" value={form.schoolEmail} />
            </label>
            <button className="mt-6 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-400" disabled={emailLoading || !form.schoolEmail} onClick={handleRequestSchoolEmailCode} type="button">인증번호 받기</button>
          </div>
          {mockCode && <div className="mt-3 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800">개발용 인증번호: <span className="font-black tracking-[0.2em]">{mockCode}</span></div>}
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" inputMode="numeric" maxLength={6} onChange={(event) => setEmailCode(event.target.value)} placeholder="6자리 인증번호" value={emailCode} />
            <button className="rounded-md border border-emerald-300 bg-white px-4 py-2 font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:bg-slate-100 disabled:text-slate-400" disabled={emailLoading || emailCode.length !== 6} onClick={handleVerifySchoolEmailCode} type="button">인증 확인</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">과제 MVP에서는 실제 메일 발송 대신 mock 인증번호를 보여줍니다. SMTP를 붙이면 같은 API 구조로 실제 발송으로 교체할 수 있습니다.</p>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">승인 후 공개 연락 수단</span>
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="contactType" onChange={handleChange} required value={form.contactType}>
              {contactTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2"><span className="text-sm font-medium text-slate-700">연락처</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="contactValue" onChange={handleChange} placeholder="승인 후에만 상대에게 공개됩니다" required value={form.contactValue} /></label>
        </div>
        <button className="rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-slate-400" disabled={saving} type="submit">
          {saving ? "저장 중..." : "내 정보 저장"}
        </button>
      </form>
    </section>
  );
}

function AppRoutes({ authReady, user, loading, serverStatus, onAuthSubmit, onLogout, onProfileSaved, showToast }) {
  return (
    <PageShell user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<HomePage serverStatus={serverStatus} user={user} />} />
        <Route path="/login" element={<AuthPage loading={loading} mode="login" onSubmit={onAuthSubmit} />} />
        <Route path="/signup" element={<AuthPage loading={loading} mode="register" onSubmit={onAuthSubmit} />} />
        <Route path="/profile" element={<ProfilePage authReady={authReady} onProfileSaved={onProfileSaved} showToast={showToast} user={user} />} />
        <Route path="/boards" element={<BoardPage user={user} />} />
        <Route path="/boards/:boardSlug" element={<BoardPage user={user} />} />
        <Route path="/posts/new" element={<PostFormPage authReady={authReady} showToast={showToast} user={user} />} />
        <Route path="/posts/:id" element={<PostDetailPage showToast={showToast} user={user} />} />
        <Route path="/posts/:id/edit" element={<PostFormPage authReady={authReady} showToast={showToast} user={user} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </PageShell>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [serverStatus, setServerStatus] = useState("확인 중...");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = useMemo(() => (message, type = "success") => setToast({ message, type }), []);

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
      } finally {
        setAuthReady(true);
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
      <AppRoutes authReady={authReady} loading={loading} onAuthSubmit={handleAuthSubmit} onLogout={handleLogout} onProfileSaved={setUser} serverStatus={serverStatus} showToast={showToast} user={user} />
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
