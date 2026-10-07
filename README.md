# TaskFlow

Project and task management with **one backend**, **one database**, and two clients:
a React web app and an Android (and iOS) app. Register on one, log in on the other, and you see the same data.

```
 React web (Vite)  ──┐
                     ├──►  FastAPI  ──►  SQLAlchemy  ──►  SQLite (or Postgres)
 Expo mobile app   ──┘     /api/*  JSON + JWT bearer token
```

| Folder     | What it is                                                        |
|------------|-------------------------------------------------------------------|
| `backend/` | FastAPI + SQLAlchemy 2 + bcrypt + JWT. 18 automated tests.        |
| `web/`     | React 19 + React Router + Vite. Plain CSS, no UI library.         |
| `mobile/`  | React Native (Expo SDK 57) + React Navigation + expo-secure-store |

---

## Run it

You need Python 3.11+, Node 20+, and for mobile an Android emulator or the Expo Go app.

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then set SECRET_KEY (command is inside the file)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: http://localhost:8000/docs. Tests: `python -m pytest`.
Tables are created automatically on first start (`taskflow.db`).

### 2. Web

```bash
cd web
npm install
npm run dev                  # http://localhost:5173
```

In development Vite forwards `/api` to `localhost:8000`, so there is nothing to configure.
For production, build (`npm run build`), serve `dist/`, and set `VITE_API_URL` and the backend's `CORS_ORIGINS`.

### 3. Mobile

```bash
cd mobile
npm install
cp .env.example .env         # set EXPO_PUBLIC_API_URL (see below)
npx expo start --android     # emulator, or scan the QR code with Expo Go
```

`EXPO_PUBLIC_API_URL` is how the phone reaches your backend:

| Where the app runs  | Value                                   |
|---------------------|-----------------------------------------|
| Android emulator    | `http://10.0.2.2:8000` (default)        |
| Physical phone      | `http://<your-computer-LAN-IP>:8000`    |
| Production          | your `https://` URL                     |

A physical phone must be on the same Wi-Fi as the computer, and the backend must listen on `0.0.0.0` (as in the command above).
Plain `http://` works in Expo Go for development; a release build needs `https://`.

---

## API

All routes are under `/api`. Everything except register/login needs `Authorization: Bearer <token>`.

| Method & path                         | Purpose                                                       |
|---------------------------------------|---------------------------------------------------------------|
| `POST /auth/register`                 | Create account, returns token + user                          |
| `POST /auth/login`                    | Returns token + user                                          |
| `POST /auth/logout`                   | Revokes the current token                                     |
| `GET  /auth/me`                       | Current user                                                  |
| `GET  /projects?search=&status=`      | My projects, each with task counts                            |
| `POST /projects`                      | Create                                                        |
| `GET/PATCH/DELETE /projects/{id}`     | Read / partial update / delete (deletes its tasks)            |
| `GET  /projects/{id}/tasks?search=&status=&priority=` | Tasks of a project                            |
| `POST /projects/{id}/tasks`           | Create task                                                   |
| `GET/PATCH/DELETE /tasks/{id}`        | Read / partial update (mark complete = `status`) / delete     |
| `GET  /dashboard`                     | Counts for the current user                                   |

Errors always look like `{"error": {"code": "...", "message": "...", "fields": {"name": "..."}}}`.
Auth failures carry a `code` (`token_expired`, `invalid_token`, `token_revoked`, `not_authenticated`) so a client can react to them precisely.

---

## Requirements checklist

| Requirement | Where |
|---|---|
| Register / login / logout, unique email | `routers/auth.py`; `UNIQUE` index on `users.email`, plus a 409 on duplicates (case-insensitive) |
| Passwords never plain text | bcrypt with per-password salt (`security.py`); test asserts the stored value is a bcrypt hash |
| Stay logged in until logout or expiry | JWT, 24 h by default (`ACCESS_TOKEN_EXPIRE_MINUTES`); web restores the session on reload via `/auth/me` |
| One account on both platforms | Same endpoints, same table |
| Projects CRUD with all fields | `routers/projects.py`; end date must not precede start date |
| Tasks CRUD, mark complete, view per project | `routers/tasks.py` |
| Dashboard (5 numbers, per user) | `routers/dashboard.py` |
| Search + filters | `search`, `status`, `priority` query params, case-insensitive, done in SQL |
| Web: responsive, components, validation, loading, errors | `web/src` (see below) |
| Mobile: everything in section 6 | `mobile/src`, see below |
| Token in Keystore/Keychain | `expo-secure-store` (`mobile/src/api/client.js`) |
| Expired token → login screen with message | 401 `token_expired` → clear token → Login shows "Your session has expired…" (web and mobile) |
| No network → message, not a crash | `fetch` failures become an `ApiError("network")` with a retry state; 12 s timeout on mobile |
| Pull-to-refresh | `RefreshControl` on dashboard, project list, and project detail; screens also reload when they regain focus |

---

## Decisions worth knowing (and why)

**Every query is scoped to the logged-in user.** A task has no owner column; its owner is its project's owner, so task
lookups join through `projects`. Asking for someone else's project or task returns **404, not 403**, so ids can't be probed.
There is a test that tries every endpoint as a second user.

**JWT plus a revocation list for logout.** A JWT is self-contained, so deleting it on the device does not stop a copied
token from working. Each token gets a unique `jti`; logout stores that id, and every request checks it. Expired
revocations are purged on the next logout, so the table stays small.

**Login doesn't reveal which emails exist.** Wrong password and unknown email return the same message, and an unknown
email still runs a bcrypt comparison so the response time matches.

**Project list counts come from one `GROUP BY` query** (LEFT JOIN, so empty projects appear), not one query per project.
That is what feeds the progress ribbon without the client downloading every task.

**Search escapes `%` and `_`**, so typing them searches for the characters instead of acting as SQL wildcards.

**`PATCH` means partial.** Only fields that are sent change; an explicit `null` clears optional fields (due date) and is
rejected for required ones. The project date-order rule is re-checked against the *merged* result, otherwise moving only
`end_date` could slip past it.

**Stale responses are discarded** (`useAsync` on both clients). Typing in a search box fires several requests; if an
older one finishes last, it must not overwrite the newer result.

**Offline never logs you out.** Only a 401 ends a session. If the app starts with no connection, it shows a retry screen and keeps the token.

**Mobile token storage vs web.** On mobile the token is in the Keystore/Keychain. On web it is in `localStorage`, which any
script on the page can read, so an XSS bug would expose it. The stricter option is an `HttpOnly` cookie; that needs CSRF
protection and a second auth path in the backend, which was out of scope here.

### Assumptions

* **"Pending tasks"** means tasks whose status is exactly *Pending*. The API also returns `in_progress_tasks`, so
  pending + in progress + completed = total. If you define "pending" as "not completed", add the two.
* **Mobile** can create/edit/delete **tasks** and view projects, as specified. Creating or editing **projects** is on the web only.
* **Due dates on mobile** are typed as `YYYY-MM-DD` (validated as a real calendar date) to avoid an extra native date-picker dependency.
* Dates are plain calendar dates (no time zone); `created_at` is stored in UTC.

---

## What was verified

* **Backend:** 18 pytest tests: auth, hashing, duplicate emails, expired/forged/revoked tokens, cross-user isolation on every
  endpoint, filters, cascade delete, counts, dashboard numbers.
* **Web:** driven end to end in a real browser (Chromium) against the live API: validation messages, register, project and task
  CRUD, search and filters, completing tasks, dashboard numbers, logout/login, session restore after reload, invalid-token
  redirect, offline error with retry, and no horizontal scroll at 390 px wide.
* **Mobile:** the full Android bundle compiles with Metro/Hermes (850 modules) and the validation helpers are unit-checked.
  **It has not been run on an emulator or device**, so do a quick manual pass: register → create a task → check it on the
  web → pull to refresh.

## Next steps for production

Rate-limit login, add refresh tokens (or shorter access tokens), Alembic migrations instead of `create_all`, Postgres,
HTTPS everywhere, and pagination on the list endpoints.
