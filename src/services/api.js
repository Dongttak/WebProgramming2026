const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : {};

  if (!response.ok) {
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
  });
}

export function login(payload) {
  return request("/api/auth/login", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function logout() {
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
