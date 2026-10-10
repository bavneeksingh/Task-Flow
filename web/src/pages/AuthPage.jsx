import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Field from "../components/Field";
import { FormError } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { hasErrors, validateLogin, validateRegister } from "../utils/validators";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register, notice } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setErrors({});
    setFormError("");
  }, [mode]);

  if (user) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = isRegister ? validateRegister(form) : validateLogin(form);
    setErrors(v);
    setFormError("");
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      const body = { ...form, email: form.email.trim() };
      if (isRegister) await register({ ...body, full_name: form.full_name.trim() });
      else await login({ email: body.email, password: form.password });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-wrapper">
        <div className="auth-panel">
          <img src="/logo.jpg" alt="TaskFlow Logo" className="auth-logo" />
          <h1 className="brand-lg">TaskFlow</h1>
          <p className="auth-tagline">
            Manage projects and tasks with ease. Stay in sync across web and mobile.
          </p>
          <ul className="auth-features">
            <li>
              <span className="feature-icon" aria-hidden="true">📊</span>
              Real-time dashboard with progress tracking
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">📱</span>
              Works on web and mobile
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">🔍</span>
              Search, filter, and organize with ease
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">🔒</span>
              Secure authentication with encryption
            </li>
          </ul>
        </div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
        <p className="auth-subtitle">
          {isRegister
            ? "Get started with TaskFlow for free."
            : "Log in to continue managing your projects."}
        </p>
        {!isRegister && notice && (
          <div className="form-notice" role="alert">
            {notice}
          </div>
        )}
        <FormError>{formError}</FormError>
        {isRegister && (
          <Field label="Full name" error={errors.full_name}>
            <input value={form.full_name} onChange={set("full_name")} autoComplete="name" autoFocus placeholder="John Doe" />
          </Field>
        )}
        <Field label="Email address" error={errors.email}>
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" autoFocus={!isRegister} placeholder="you@example.com" />
        </Field>
        <Field
          label="Password"
          error={errors.password}
          hint={isRegister ? "At least 8 characters." : undefined}
        >
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="••••••••"
          />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </button>
        <p className="auth-switch">
          {isRegister ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link to="/register">Create an account</Link>
            </>
          )}
        </p>
      </form>
      </div>
    </div>
  );
}
