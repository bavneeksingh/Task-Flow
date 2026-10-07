// The single place that talks to the backend. Everything else calls the functions below.
const BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "taskflow.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, { status = 0, code = "error", fields } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields; // per-field validation messages from the server, if any
  }
}

const SESSION_CODES = new Set(["token_expired", "invalid_token", "token_revoked", "not_authenticated"]);
let onSessionEnded = () => {};
export function setSessionEndedHandler(fn) {
  onSessionEnded = fn;
}

async function request(path, { method = "GET", body, params, auth = true } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => v !== "" && v != null && url.searchParams.set(k, v));

  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    // fetch only rejects when no response arrived at all (offline, server down, DNS...)
    throw new ApiError("Can't reach the server. Check your connection and try again.", { code: "network" });
  }

  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const err = data?.error || {};
    const e = new ApiError(err.message || `Something went wrong (${res.status}).`, {
      status: res.status,
      code: err.code,
      fields: err.fields,
    });
    if (auth && res.status === 401 && SESSION_CODES.has(e.code)) onSessionEnded(e.message);
    throw e;
  }
  return data;
}

export const api = {
  register: (b) => request("/api/auth/register", { method: "POST", body: b, auth: false }),
  login: (b) => request("/api/auth/login", { method: "POST", body: b, auth: false }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),

  dashboard: () => request("/api/dashboard"),

  listProjects: (params) => request("/api/projects", { params }),
  getProject: (id) => request(`/api/projects/${id}`),
  createProject: (b) => request("/api/projects", { method: "POST", body: b }),
  updateProject: (id, b) => request(`/api/projects/${id}`, { method: "PATCH", body: b }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: "DELETE" }),

  listTasks: (pid, params) => request(`/api/projects/${pid}/tasks`, { params }),
  createTask: (pid, b) => request(`/api/projects/${pid}/tasks`, { method: "POST", body: b }),
  updateTask: (id, b) => request(`/api/tasks/${id}`, { method: "PATCH", body: b }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),
  listAllTasks: (params) => request("/api/tasks", { params }),
};
