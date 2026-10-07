import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config";

// SecureStore keeps the value in the Android Keystore-backed encrypted storage
// (iOS Keychain), unlike AsyncStorage which is plain text on disk.
const TOKEN_KEY = "taskflow.token";
let cached = null;
let loaded = false;

export const tokenStore = {
  async get() {
    if (!loaded) {
      cached = await SecureStore.getItemAsync(TOKEN_KEY);
      loaded = true;
    }
    return cached;
  },
  async set(token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    cached = token;
    loaded = true;
  },
  async clear() {
    cached = null;
    loaded = true;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, { status = 0, code = "error", fields } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const SESSION_CODES = new Set(["token_expired", "invalid_token", "token_revoked", "not_authenticated"]);
const TIMEOUT_MS = 12000;

let onSessionEnded = () => {};
export function setSessionEndedHandler(fn) {
  onSessionEnded = fn;
}

const toQuery = (params = {}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

async function request(path, { method = "GET", body, params, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Without a timeout, a dead connection can leave a spinner on screen for minutes.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_URL + path + toQuery(params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError(
      e?.name === "AbortError"
        ? "The server took too long to respond. Please try again."
        : "No internet connection. Check your network and try again.",
      { code: "network" }
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;
  let data = null;
  try {
    data = JSON.parse(await res.text());
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
  listTasks: (pid, params) => request(`/api/projects/${pid}/tasks`, { params }),
  createTask: (pid, b) => request(`/api/projects/${pid}/tasks`, { method: "POST", body: b }),
  updateTask: (id, b) => request(`/api/tasks/${id}`, { method: "PATCH", body: b }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),
};
