const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "itda_auth_token";

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

function storeToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : {};

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    throw new Error(data.error ?? `API request failed: ${response.status}`);
  }

  return data;
}

function queryString(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getHealth() {
  return request("/api/health");
}

export function register(payload) {
  return request("/api/auth/register", {
    body: JSON.stringify(payload),
    method: "POST",
  }).then((data) => {
    storeToken(data.token);
    return data;
  });
}

export function login(payload) {
  return request("/api/auth/login", {
    body: JSON.stringify(payload),
    method: "POST",
  }).then((data) => {
    storeToken(data.token);
    return data;
  });
}

export function logout() {
  clearToken();
  return request("/api/auth/logout", { method: "POST" });
}

export function getCurrentUser() {
  return request("/api/auth/me");
}

export function getPosts(filters = {}) {
  return request(`/api/posts${queryString(filters)}`);
}

export function getPost(id) {
  return request(`/api/posts/${id}`);
}

export function createPost(payload) {
  return request("/api/posts", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function updatePost(id, payload) {
  return request(`/api/posts/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT",
  });
}

export function deletePost(id) {
  return request(`/api/posts/${id}`, { method: "DELETE" });
}

export function requestAiRecommendation(payload) {
  return request("/api/ai/recommend", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}
