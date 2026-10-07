export const PROJECT_STATUSES = ["Not Started", "In Progress", "Completed"];
export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];
export const PRIORITIES = ["Low", "Medium", "High"];

// "2026-03-05" -> "5 Mar 2026". Built from parts, because new Date("2026-03-05")
// is parsed as UTC and can display as the previous day in time zones behind UTC.
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

export const isOverdue = (task) =>
  Boolean(task.due_date) && task.status !== "Completed" && task.due_date < todayISO();

export const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");
