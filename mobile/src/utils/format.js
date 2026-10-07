export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];
export const PRIORITIES = ["Low", "Medium", "High"];

export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const isOverdue = (t) => Boolean(t.due_date) && t.status !== "Completed" && t.due_date < todayISO();

// Accepts only real calendar dates: "2026-02-30" has the right shape but is not a date.
export function isValidISODate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin({ email, password }) {
  const e = {};
  if (!email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
  if (!password) e.password = "Enter your password.";
  return e;
}

export function validateRegister({ full_name, email, password }) {
  const e = validateLogin({ email, password: password || "x" });
  if (!full_name.trim()) e.full_name = "Enter your full name.";
  if (!password) e.password = "Choose a password.";
  else if (password.length < 8) e.password = "Use at least 8 characters.";
  else if (password.length > 72) e.password = "Use at most 72 characters.";
  return e;
}

export function validateTask({ name, description, due_date }) {
  const e = {};
  if (!name.trim()) e.name = "Give the task a name.";
  else if (name.trim().length > 160) e.name = "Keep the name under 160 characters.";
  if (description.length > 5000) e.description = "Keep the description under 5000 characters.";
  if (due_date && !isValidISODate(due_date)) e.due_date = "Use the format YYYY-MM-DD, for example 2026-12-31.";
  return e;
}
