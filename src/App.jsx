import { useEffect, useMemo, useState } from "react";
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
  { value: "teamplay", label: "팀플", description: "수업 과제와 프로젝트 팀원 찾기" },
  { value: "meal", label: "밥", description: "점심, 저녁, 번개 식사 메이트 찾기" },
  { value: "roommate", label: "룸메", description: "생활 패턴이 맞는 룸메이트 찾기" },
  { value: "global", label: "외국인 교류", description: "언어 교환과 문화 교류 친구 찾기" },
];

const emptyPost = {
  title: "",
  category: "teamplay",
  location: "",
  meeting_time: "",
  keywords: "",
  content: "",
};

function categoryLabel(value) {
  return categories.find((category) => category.value === value)?.label ?? value;
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

function Notice({ message, type = "info" }) {
  if (!message) return null;

  const styles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>{message}</div>;
}

function AuthForm({ mode, onSubmit, onSwitch, loading, error }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    major: "",
  });

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-950">
        {isRegister ? "회원가입" : "로그인"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        학교 이메일이 아니어도 과제 시연용으로 가입할 수 있습니다.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {isRegister && (
          <>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">이름</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500"
                name="name"
                onChange={handleChange}
                required
                value={form.name}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">학과</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500"
                name="major"
                onChange={handleChange}
                placeholder="예: 컴퓨터공학과"
                value={form.major}
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">이메일</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500"
            name="email"
            onChange={handleChange}
            required
            type="email"
            value={form.email}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">비밀번호</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-sky-500"
            minLength={4}
            name="password"
            onChange={handleChange}
            required
            type="password"
            value={form.password}
          />
        </label>

        <Notice message={error} type="error" />

        <button
          className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "처리 중..." : isRegister ? "가입하기" : "로그인하기"}
        </button>
      </form>

      <button
        className="mt-4 w-full text-sm font-medium text-sky-700 hover:text-sky-900"
        onClick={onSwitch}
        type="button"
      >
        {isRegister ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 회원가입"}
      </button>
    </section>
  );
}

function Home({ onNavigate, serverStatus, user }) {
  return (
    <section className="space-y-8">
      <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <span className="inline-flex rounded-md bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
            ITDA Matching MVP
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            잇다
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            대학생들이 팀플, 밥, 룸메, 외국인 교류 같은 목적별로 매칭 글을 올리고
            필요한 사람을 찾는 과제 제출용 MVP입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-md bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              onClick={() => onNavigate("list")}
              type="button"
            >
              글 목록 보기
            </button>
            <button
              className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={() => onNavigate(user ? "write" : "login")}
              type="button"
            >
              매칭 글 작성
            </button>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500">서버 상태</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{serverStatus}</p>
          <div className="mt-5 grid gap-3">
            {categories.map((category) => (
              <div key={category.value} className="rounded-md border border-slate-200 bg-white p-4">
                <p className="font-bold text-slate-950">{category.label}</p>
                <p className="mt-1 text-sm text-slate-500">{category.description}</p>
              </div>
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

function PostList({ filters, loading, onFilter, onOpen, onWrite, posts }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">매칭 글 목록</h2>
          <p className="mt-1 text-sm text-slate-500">카테고리와 키워드로 글을 찾아보세요.</p>
        </div>
        <button
          className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
          onClick={onWrite}
          type="button"
        >
          새 글 작성
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[180px_1fr]">
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-950"
          name="category"
          onChange={onFilter}
          value={filters.category}
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-950"
          name="q"
          onChange={onFilter}
          placeholder="제목, 내용, 키워드 검색"
          value={filters.q}
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          불러오는 중...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          아직 조건에 맞는 글이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <button
              className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
              key={post.id}
              onClick={() => onOpen(post.id)}
              type="button"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {categoryLabel(post.category)}
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
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function PostForm({ initialPost, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState(initialPost ?? emptyPost);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(initialPost ?? emptyPost);
  }, [initialPost]);

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function handleRecommend() {
    setAiLoading(true);
    setMessage("");
    try {
      const data = await requestAiRecommendation({
        category: form.category,
        keywords: form.keywords,
      });
      setForm((prev) => ({
        ...prev,
        title: data.title,
        content: data.content,
      }));
      setMessage("AI 추천 예시를 입력했습니다. 자유롭게 수정해보세요.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAiLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            {initialPost?.id ? "매칭 글 수정" : "매칭 글 작성"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            키워드를 입력한 뒤 AI 추천 버튼을 누르면 제목과 내용 예시가 채워집니다.
          </p>
        </div>
        <button
          className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          취소
        </button>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">카테고리</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              name="category"
              onChange={handleChange}
              value={form.category}
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">키워드</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              name="keywords"
              onChange={handleChange}
              placeholder="예: React, 발표, 화요일 저녁"
              value={form.keywords}
            />
          </label>
        </div>

        <button
          className="w-fit rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
          disabled={aiLoading}
          onClick={handleRecommend}
          type="button"
        >
          {aiLoading ? "추천 생성 중..." : "AI 추천 받기"}
        </button>
        <Notice message={message} />

        <label className="block">
          <span className="text-sm font-medium text-slate-700">제목</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
            name="title"
            onChange={handleChange}
            required
            value={form.title}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">장소</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              name="location"
              onChange={handleChange}
              placeholder="예: 중앙도서관, 학생식당"
              value={form.location}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">희망 시간</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
              name="meeting_time"
              onChange={handleChange}
              placeholder="예: 월/수 18시 이후"
              value={form.meeting_time}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">내용</span>
          <textarea
            className="mt-1 min-h-44 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
            name="content"
            onChange={handleChange}
            required
            value={form.content}
          />
        </label>

        <button
          className="rounded-md bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:bg-slate-400"
          disabled={loading}
          type="submit"
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </form>
    </section>
  );
}

function PostDetail({ onBack, onDelete, onEdit, post, user }) {
  const isOwner = user && post?.author_id === user.id;

  if (!post) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        글을 찾을 수 없습니다.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <button className="text-sm font-semibold text-sky-700" onClick={onBack} type="button">
        목록으로 돌아가기
      </button>
      <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {categoryLabel(post.category)}
          </span>
          <h2 className="mt-4 text-3xl font-black text-slate-950">{post.title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {post.author_name} · {formatDate(post.created_at)}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onEdit}
              type="button"
            >
              수정
            </button>
            <button
              className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              onClick={onDelete}
              type="button"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-3">
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
      </dl>

      <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-700">{post.content}</p>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [filters, setFilters] = useState({ category: "", q: "" });
  const [serverStatus, setServerStatus] = useState("확인 중...");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navItems = useMemo(
    () => [
      { id: "home", label: "홈" },
      { id: "list", label: "글 목록" },
      { id: "write", label: "글 작성" },
    ],
    [],
  );

  async function loadUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  async function loadPosts(nextFilters = filters) {
    setListLoading(true);
    try {
      const data = await getPosts(nextFilters);
      setPosts(data.posts);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const data = await getHealth();
        setServerStatus(data.message);
      } catch {
        setServerStatus("Flask 서버 연결 실패");
      }
      await loadUser();
    }
    boot();
  }, []);

  useEffect(() => {
    if (view === "list") {
      loadPosts(filters);
    }
  }, [view, filters]);

  function navigate(nextView) {
    setError("");
    setNotice("");
    if (nextView === "write" && !user) {
      setAuthMode("login");
      setView("login");
      return;
    }
    setView(nextView);
  }

  async function handleAuthSubmit(form) {
    setLoading(true);
    setError("");
    try {
      const data = authMode === "register" ? await register(form) : await login(form);
      setUser(data.user);
      setNotice(authMode === "register" ? "회원가입이 완료되었습니다." : "로그인되었습니다.");
      setView("list");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setSelectedPost(null);
    setNotice("로그아웃되었습니다.");
    setView("home");
  }

  function handleFilter(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  async function openPost(id) {
    setLoading(true);
    setError("");
    try {
      const data = await getPost(id);
      setSelectedPost(data.post);
      setView("detail");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePost(form) {
    setLoading(true);
    setError("");
    try {
      const data = editingPost?.id ? await updatePost(editingPost.id, form) : await createPost(form);
      setSelectedPost(data.post);
      setEditingPost(null);
      setNotice("저장되었습니다.");
      setView("detail");
      await loadPosts(filters);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  async function removePost() {
    if (!selectedPost || !window.confirm("정말 삭제할까요?")) return;
    setLoading(true);
    setError("");
    try {
      await deletePost(selectedPost.id);
      setSelectedPost(null);
      setNotice("삭제되었습니다.");
      setView("list");
      await loadPosts(filters);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <button className="text-left" onClick={() => navigate("home")} type="button">
            <p className="text-2xl font-black text-slate-950">잇다</p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              ITDA
            </p>
          </button>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <button
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  view === item.id
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                key={item.id}
                onClick={() => navigate(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            {user ? (
              <>
                <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  {user.name}
                </span>
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={handleLogout}
                  type="button"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setAuthMode("login");
                  navigate("login");
                }}
                type="button"
              >
                로그인
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-5 space-y-3">
          <Notice message={notice} />
          <Notice message={error} type="error" />
        </div>

        {view === "home" && (
          <Home onNavigate={navigate} serverStatus={serverStatus} user={user} />
        )}
        {view === "login" && (
          <AuthForm
            error={error}
            loading={loading}
            mode={authMode}
            onSubmit={handleAuthSubmit}
            onSwitch={() => {
              setError("");
              setAuthMode((prev) => (prev === "login" ? "register" : "login"));
            }}
          />
        )}
        {view === "list" && (
          <PostList
            filters={filters}
            loading={listLoading}
            onFilter={handleFilter}
            onOpen={openPost}
            onWrite={() => navigate("write")}
            posts={posts}
          />
        )}
        {view === "write" && (
          <PostForm
            initialPost={emptyPost}
            loading={loading}
            onCancel={() => navigate("list")}
            onSubmit={savePost}
          />
        )}
        {view === "detail" && (
          <PostDetail
            onBack={() => navigate("list")}
            onDelete={removePost}
            onEdit={() => {
              setEditingPost(selectedPost);
              setView("edit");
            }}
            post={selectedPost}
            user={user}
          />
        )}
        {view === "edit" && (
          <PostForm
            initialPost={editingPost}
            loading={loading}
            onCancel={() => {
              setEditingPost(null);
              setView("detail");
            }}
            onSubmit={savePost}
          />
        )}
      </main>
    </div>
  );
}
