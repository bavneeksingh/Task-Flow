# 📋 TaskFlow — Full-Stack Project & Task Management

> A complete project-management platform with a **React web app**, **Node.js REST API**, **Flutter mobile app**, and **PostgreSQL** database. Manage projects, break them into tasks, and track progress across web and mobile.

---

## Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [Database Schema & ER Diagram](#-database-schema--er-diagram)
5. [API Documentation](#-api-documentation)
6. [Getting Started](#-getting-started)
7. [Environment Variables](#-environment-variables)
8. [Deployment](#-deployment)
9. [Screenshots](#-screenshots)
10. [License](#-license)

---

## ✨ Features

| Area | Highlights |
|------|-----------|
| **Authentication** | Register, Login, JWT-based sessions (7-day expiry), rate limiting |
| **Projects** | Create, update, delete projects with status tracking, search & filter |
| **Tasks** | Full CRUD per project, priority levels (Low / Medium / High), due dates |
| **Dashboard** | Aggregate stats — total projects, task breakdown by status, donut chart |
| **Auto-Sync** | Project status auto-updates based on task completion |
| **Mobile** | Native Flutter app (Android + iOS + macOS) with shared backend |
| **Security** | Password hashing (bcrypt), input validation, CORS, secure token storage |

---

## 🛠 Tech Stack

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Web:    React 18 · Vite · Vanilla CSS · React Router        │
│  Mobile: Flutter 3.x · Dart · Provider · flutter_secure_storage │
├──────────────────────────────────────────────────────────────┤
│                        BACKEND                               │
│  Runtime:    Node.js · Express 5                             │
│  ORM:        Prisma 5                                        │
│  Auth:       JSON Web Tokens · bcryptjs                      │
│  Validation: express-validator                               │
│  Rate Limit: express-rate-limit                              │
├──────────────────────────────────────────────────────────────┤
│                       DATABASE                               │
│  PostgreSQL 15                                               │
├──────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE                           │
│  Docker Compose · Nginx · Vercel (optional)                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
taskflow/
├── backend-node/              # Node.js REST API
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── index.js           # Express app entry point
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js        # Register, Login, Logout, Me
│   │   │   ├── projects.js    # Project CRUD + nested task routes
│   │   │   ├── tasks.js       # Standalone task CRUD
│   │   │   └── dashboard.js   # Aggregate statistics
│   │   └── utils/
│   │       └── projectSync.js # Auto-update project status from tasks
│   ├── package.json
│   └── .env
│
├── web/                       # React SPA (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   └── App.jsx            # Root with React Router
│   ├── vite.config.js
│   └── nginx.conf             # Production proxy config
│
├── flutter_app/
│   └── mobile_flutter/        # Flutter mobile app
│       ├── lib/
│       │   ├── main.dart      # App entry, Provider setup
│       │   ├── config.dart    # API base URL configuration
│       │   ├── theme.dart     # Material theme (matches web)
│       │   ├── api/
│       │   │   └── api_client.dart  # HTTP client, token store
│       │   ├── models/
│       │   │   └── models.dart      # Data classes
│       │   ├── screens/             # All app screens
│       │   ├── state/
│       │   │   └── auth_state.dart  # Auth state management
│       │   └── widgets/             # Reusable widgets
│       ├── pubspec.yaml
│       ├── android/
│       ├── ios/
│       └── macos/
│
├── docker-compose.yml         # One-command full stack
└── README.md
```

---

## 🗄 Database Schema & ER Diagram

### ER Diagram

```mermaid
erDiagram
    USER ||--o{ PROJECT : "owns"
    PROJECT ||--o{ TASK : "contains"

    USER {
        int id PK "Auto-increment"
        string email UK "Unique"
        string password "bcrypt hash"
        string fullName
        datetime createdAt "Default: now()"
    }

    PROJECT {
        int id PK "Auto-increment"
        string name
        string description "Nullable"
        string status "Not Started | In Progress | Completed"
        string startDate "Nullable, YYYY-MM-DD"
        string endDate "Nullable, YYYY-MM-DD"
        int ownerId FK "References User.id"
        datetime createdAt "Default: now()"
    }

    TASK {
        int id PK "Auto-increment"
        string name
        string description "Nullable"
        string status "Pending | In Progress | Completed"
        string priority "Low | Medium | High"
        string dueDate "Nullable, YYYY-MM-DD"
        int projectId FK "References Project.id"
        datetime createdAt "Default: now()"
    }
```

### Prisma Schema

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  password  String
  fullName  String
  projects  Project[]
  createdAt DateTime  @default(now())
}

model Project {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  status      String    @default("Not Started")   // Not Started | In Progress | Completed
  startDate   String?
  endDate     String?
  ownerId     Int
  owner       User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  tasks       Task[]
  createdAt   DateTime  @default(now())
}

model Task {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  status      String    @default("Pending")        // Pending | In Progress | Completed
  priority    String    @default("Medium")          // Low | Medium | High
  dueDate     String?
  projectId   Int
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
}
```

### Relationships

| Relationship | Type | Cascade |
|---|---|---|
| `User` → `Project` | One-to-Many | Delete user → deletes all their projects |
| `Project` → `Task` | One-to-Many | Delete project → deletes all its tasks |

### Auto-Status Sync Logic

When a task is created, updated, or deleted, the parent project's status is automatically recalculated:

| Condition | Resulting Project Status |
|---|---|
| No tasks exist | `Not Started` |
| All tasks are `Completed` | `Completed` |
| Any task is `In Progress` or `Completed` | `In Progress` |
| Otherwise | `Not Started` |

---

## 📡 API Documentation

**Base URL:** `http://localhost:8000`

All endpoints return JSON. Protected routes require the header:
```
Authorization: Bearer <access_token>
```

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "error_code",
    "fields": {
      "field_name": "Field-specific error message"
    }
  }
}
```

---

### 🔐 Authentication — `/api/auth`

> Rate limited: 10 req / 15 min per IP (production), 1000 (development)

#### `POST /api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| `email` | Must be a valid email address |
| `password` | Minimum 8 characters |
| `full_name` | Required, non-empty |

**Success Response** — `201 Created`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Validation failed or email already registered |
| `429` | Rate limit exceeded |
| `500` | Server error |

---

#### `POST /api/auth/login`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Success Response** — `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Validation failed |
| `401` | Incorrect email or password |
| `429` | Rate limit exceeded |

---

#### `POST /api/auth/logout` 🔒

Invalidate the current session (client discards token).

**Response** — `204 No Content`

---

#### `GET /api/auth/me` 🔒

Get the currently authenticated user's profile.

**Success Response** — `200 OK`:
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

---

### 📊 Dashboard — `/api/dashboard`

#### `GET /api/dashboard` 🔒

Get aggregate statistics for the authenticated user.

**Success Response** — `200 OK`:
```json
{
  "total_projects": 5,
  "total_tasks": 23,
  "pending_tasks": 8,
  "in_progress_tasks": 10,
  "completed_tasks": 5
}
```

---

### 📂 Projects — `/api/projects`

> All routes require authentication 🔒

#### `GET /api/projects`

List all projects owned by the authenticated user.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `search` | `string` | Filter by name (case-insensitive partial match) |
| `status` | `string` | Filter by status: `Not Started`, `In Progress`, `Completed` |

**Success Response** — `200 OK`:
```json
[
  {
    "id": 1,
    "name": "Website Redesign",
    "description": "Modernize the company website",
    "status": "In Progress",
    "start_date": "2026-01-15",
    "end_date": "2026-03-30",
    "created_at": "2026-01-10T08:30:00.000Z",
    "task_count": 12,
    "pending_count": 3,
    "in_progress_count": 5,
    "completed_count": 4
  }
]
```

---

#### `POST /api/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Modernize the company website",
  "status": "Not Started",
  "start_date": "2026-01-15",
  "end_date": "2026-03-30"
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| `name` | Required, max 120 characters |
| `description` | Optional, max 5000 characters |
| `status` | Optional, one of: `Not Started`, `In Progress`, `Completed` |

**Success Response** — `201 Created`: Returns the created project object.

---

#### `GET /api/projects/:id`

Get a single project by ID (with computed task counts).

**Success Response** — `200 OK`: Same format as list item.

**Error:** `404` if project not found or not owned by user.

---

#### `PATCH /api/projects/:id`

Partially update a project. Only include fields you want to change.

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "Completed",
  "start_date": "2026-02-01",
  "end_date": "2026-04-15"
}
```

**Success Response** — `200 OK`: Returns the updated project object.

---

#### `DELETE /api/projects/:id`

Delete a project and all its tasks (cascade).

**Response** — `204 No Content`

---

#### `GET /api/projects/:id/tasks`

List all tasks belonging to a project.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `search` | `string` | Filter by name (case-insensitive partial match) |
| `status` | `string` | `Pending`, `In Progress`, `Completed` |
| `priority` | `string` | `Low`, `Medium`, `High` |

**Success Response** — `200 OK`:
```json
[
  {
    "id": 1,
    "name": "Design homepage mockup",
    "description": "Create Figma designs",
    "status": "In Progress",
    "priority": "High",
    "due_date": "2026-02-01",
    "project_id": 1,
    "created_at": "2026-01-12T10:00:00.000Z"
  }
]
```

---

#### `POST /api/projects/:id/tasks`

Create a task within a project.

**Request Body:**
```json
{
  "name": "Design homepage mockup",
  "description": "Create Figma designs for the new homepage",
  "status": "Pending",
  "priority": "High",
  "due_date": "2026-02-01"
}
```

**Validation:** `name` is required (max 160 chars). All other fields are optional.

**Success Response** — `201 Created`: Returns the created task object.

> **Side-effect:** The parent project's status is automatically recalculated.

---

### ✅ Tasks — `/api/tasks`

> All routes require authentication 🔒. Standalone task endpoints (tasks can also be managed via `/api/projects/:id/tasks`).

#### `GET /api/tasks`

List all tasks across all projects owned by the user.

**Success Response** — `200 OK`: Array of task objects.

---

#### `GET /api/tasks/:id`

Get a single task by ID.

**Success Response** — `200 OK`: Task object.

**Error:** `404` if not found or not owned by user.

---

#### `POST /api/tasks`

Create a task (standalone endpoint).

**Request Body:**
```json
{
  "project_id": 1,
  "name": "Implement login page",
  "description": "Build the authentication UI",
  "status": "Pending",
  "priority": "Medium",
  "due_date": "2026-02-15"
}
```

**Validation:** `project_id` (integer, required) and `name` (required, max 160 chars).

**Success Response** — `201 Created`

---

#### `PATCH /api/tasks/:id`

Partially update a task.

**Request Body** (all fields optional):
```json
{
  "name": "Updated task name",
  "status": "Completed",
  "priority": "Low",
  "due_date": "2026-03-01"
}
```

**Success Response** — `200 OK`: Updated task object.

> **Side-effect:** The parent project's status is automatically recalculated.

---

#### `PUT /api/tasks/:id`

Full replacement update of a task.

**Request Body:** Same as POST, but `project_id` is not changed.

**Success Response** — `200 OK`

---

#### `DELETE /api/tasks/:id`

Delete a task.

**Response** — `204 No Content`

> **Side-effect:** The parent project's status is automatically recalculated.

---

### HTTP Status Code Summary

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `204` | Success, no content returned |
| `400` | Bad request / validation error |
| `401` | Not authenticated or invalid token |
| `404` | Resource not found |
| `422` | Unprocessable entity |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** 15+
- **Flutter** ≥ 3.27 (for mobile app)
- **npm** or **yarn**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
```

### 2. Backend Setup

```bash
cd backend-node
npm install
```

Create a `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/taskflow"
JWT_SECRET="your-secret-key-here-make-it-long-and-random"
```

Run database migrations:

```bash
npx prisma migrate dev --name init
```

Start the server:

```bash
npm run dev    # Development (with hot reload via nodemon)
npm start      # Production
```

The API will be available at `http://localhost:8000`.

### 3. Web Frontend Setup

```bash
cd web
npm install
npm run dev
```

The web app will be available at `http://localhost:5173` and proxies API calls to the backend.

### 4. Flutter Mobile App Setup

```bash
cd flutter_app/mobile_flutter
flutter pub get
```

**Run on Android (physical device via USB):**
```bash
adb reverse tcp:8000 tcp:8000      # Forward port over USB
flutter run
```

**Run on iOS Simulator:**
```bash
flutter run -d "iPhone 16 Pro"
```

**Run on macOS Desktop:**
```bash
flutter run -d macos
```

**Run on Chrome:**
```bash
flutter run -d chrome
```

### 5. Docker (Full Stack in One Command)

```bash
docker compose up --build
```

| Service | Port | Description |
|---------|------|-------------|
| `db` | `5432` | PostgreSQL database |
| `backend` | `8000` | Node.js API server |
| `frontend` | `80` | React web app (Nginx) |

---

## 🔑 Environment Variables

### Backend (`backend-node/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DIRECT_URL` | ❌ | Direct DB URL (for Supabase connection pooler) |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `PORT` | ❌ | Server port (default: `8000`) |
| `NODE_ENV` | ❌ | `production` for strict rate limits |

### Flutter Mobile (`flutter_app/mobile_flutter/lib/config.dart`)

Override the API URL at build time:

```bash
flutter run --dart-define=API_URL=http://192.168.1.100:8000
```

Default: `http://127.0.0.1:8000` (requires `adb reverse` for Android physical devices).

---

## ☁️ Deployment

### Backend — Vercel / Railway / Render

1. Set environment variables (`DATABASE_URL`, `JWT_SECRET`)
2. Build command: `npm install`
3. Start command: `node src/index.js`

### Web — Vercel

1. Root directory: `web`
2. Framework: Vite
3. Set `VITE_PROXY_TARGET` to your deployed backend URL

### Database — Supabase / Neon / Railway

Use a managed PostgreSQL instance. Update `DATABASE_URL` accordingly. If using Supabase with connection pooler, also set `DIRECT_URL`.

---

## 📸 Screenshots

*Screenshots of the web dashboard, project detail page, and Flutter mobile app can be added here.*

---

## 📄 License

This project is for educational purposes. All rights reserved.
