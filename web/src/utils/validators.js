// Client-side checks give instant feedback. The server repeats every rule, because
// the client can never be trusted: these only exist to save the user a round trip.
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
  else if (full_name.trim().length > 120) e.full_name = "Keep your name under 120 characters.";
  if (!password) e.password = "Choose a password.";
  else if (password.length < 8) e.password = "Use at least 8 characters.";
  else if (new TextEncoder().encode(password).length > 72) e.password = "Use at most 72 characters.";
  return e;
}

export function validateProject({ name, description, start_date, end_date }) {
  const e = {};
  if (!name.trim()) e.name = "Give the project a name.";
  else if (name.trim().length > 120) e.name = "Keep the name under 120 characters.";
  if (description.length > 5000) e.description = "Keep the description under 5000 characters.";
  if (start_date && end_date && end_date < start_date) e.end_date = "End date can't be before the start date.";
  return e;
}

export function validateTask({ name, description }) {
  const e = {};
  if (!name.trim()) e.name = "Give the task a name.";
  else if (name.trim().length > 160) e.name = "Keep the name under 160 characters.";
  if (description.length > 5000) e.description = "Keep the description under 5000 characters.";
  return e;
}

export const hasErrors = (e) => Object.keys(e).length > 0;
