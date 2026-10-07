import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import ProjectFormModal from "../components/ProjectFormModal";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import StatusRibbon from "../components/StatusRibbon";
import TaskFormModal from "../components/TaskFormModal";
import { useToast } from "../context/ToastContext";
import { useAsync, useDebounce } from "../hooks/useAsync";
import { PRIORITIES, TASK_STATUSES, formatDate, isOverdue } from "../utils/format";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const debounced = useDebounce(search);

  // modal state: null | {type: "task", task?} | {type: "editProject"} | {type: "deleteProject"} | {type: "deleteTask", task}
  const [modal, setModal] = useState(null);
  const [busyTask, setBusyTask] = useState(null);

  const project = useAsync(() => api.getProject(id), [id]);
  const tasks = useAsync(
    () => api.listTasks(id, { search: debounced.trim(), status, priority }),
    [id, debounced, status, priority]
  );

  const refresh = () => {
    project.reload(); // counts / ribbon
    tasks.reload();
  };

  const patchTask = async (task, changes, message) => {
    setBusyTask(task.id);
    try {
      await api.updateTask(task.id, changes);
      if (message) toast(message);
      refresh();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusyTask(null);
    }
  };

  if (!project.data && project.loading) return <Spinner label="Loading project" />;
  if (!project.data && project.error) {
    return project.error.status === 404 ? (
      <EmptyState title="Project not found" action={<Link className="btn" to="/projects">Back to projects</Link>}>
        It may have been deleted, or it belongs to another account.
      </EmptyState>
    ) : (
      <ErrorState error={project.error} onRetry={project.reload} />
    );
  }

  const p = project.data;
  const filtering = Boolean(debounced.trim() || status || priority);
  const completionPct = p.task_count > 0 ? Math.round((p.completed_count / p.task_count) * 100) : 0;

  return (
    <>
      <Link to="/projects" className="back">Projects</Link>
      <div className="page-head">
        <div>
          <h1>{p.name}</h1>
          <div className="meta">
            <StatusBadge status={p.status} />
            {(p.start_date || p.end_date) && (
              <span className="muted small">
                📅 {p.start_date ? formatDate(p.start_date) : "No start"} → {p.end_date ? formatDate(p.end_date) : "no end"}
              </span>
            )}
            <span className="muted small">Created {formatDate(p.created_at.slice(0, 10))}</span>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setModal({ type: "editProject" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button className="btn btn-danger-quiet" onClick={() => setModal({ type: "deleteProject" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>
      {p.description && <p className="lede">{p.description}</p>}

      {/* Project progress panel */}
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2>📈 Progress</h2>
          <span className="muted small" style={{ fontWeight: 600 }}>{completionPct}% complete</span>
        </div>
        <StatusRibbon tall pending={p.pending_count} inProgress={p.in_progress_count} completed={p.completed_count} />
        <ul className="legend">
          <li><span className="swatch seg-done" />{p.completed_count} completed</li>
          <li><span className="swatch seg-doing" />{p.in_progress_count} in progress</li>
          <li><span className="swatch seg-todo" />{p.pending_count} pending</li>
        </ul>
      </section>

      <div className="page-head sub">
        <h2>📝 Tasks {tasks.data ? `(${tasks.data.length})` : ""}</h2>
        <button className="btn btn-primary" onClick={() => setModal({ type: "task" })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add task
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="🔍 Search tasks by name…"
          aria-label="Search tasks by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {!tasks.data && tasks.loading && <Spinner label="Loading tasks" />}
      {tasks.error && <ErrorState error={tasks.error} onRetry={tasks.reload} />}

      {tasks.data && tasks.data.length === 0 && !tasks.error && (
        <EmptyState
          title={filtering ? "No tasks match" : "No tasks yet"}
          action={
            filtering ? (
              <button className="btn" onClick={() => { setSearch(""); setStatus(""); setPriority(""); }}>Clear filters</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setModal({ type: "task" })}>Add the first task</button>
            )
          }
        >
          {filtering ? "Try different filters." : "Break this project into tasks to track progress."}
        </EmptyState>
      )}

      {tasks.data && tasks.data.length > 0 && (
        <ul className={`tasks${tasks.loading ? " is-stale" : ""}`}>
          {tasks.data.map((t) => {
            const done = t.status === "Completed";
            return (
              <li key={t.id} className={`task${done ? " is-done" : ""}`}>
                <button
                  className={`check${done ? " checked" : ""}`}
                  role="checkbox"
                  aria-checked={done}
                  aria-label={done ? `Mark "${t.name}" as pending` : `Mark "${t.name}" as completed`}
                  disabled={busyTask === t.id}
                  onClick={() =>
                    patchTask(t, { status: done ? "Pending" : "Completed" }, done ? "Task reopened" : "Task completed ✓")
                  }
                />
                <div className="task-main">
                  <span className="task-name">{t.name}</span>
                  {t.description && <p className="row-desc">{t.description}</p>}
                  <div className="meta">
                    <PriorityBadge priority={t.priority} />
                    {t.due_date && (
                      <span className={`small ${isOverdue(t) ? "overdue" : "muted"}`}>
                        {isOverdue(t) ? "⚠️ Overdue, due " : "📅 Due "}
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  className="inline-select"
                  aria-label={`Status of ${t.name}`}
                  value={t.status}
                  disabled={busyTask === t.id}
                  onChange={(e) => patchTask(t, { status: e.target.value })}
                >
                  {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <div className="actions">
                  <button className="btn btn-quiet btn-sm" onClick={() => setModal({ type: "task", task: t })}>
                    Edit
                  </button>
                  <button className="btn btn-quiet btn-sm btn-danger-quiet" onClick={() => setModal({ type: "deleteTask", task: t })}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modal?.type === "task" && (
        <TaskFormModal
          projectId={p.id}
          task={modal.task}
          onClose={() => setModal(null)}
          onSaved={() => {
            toast(modal.task ? "Task updated" : "Task added");
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal?.type === "editProject" && (
        <ProjectFormModal
          project={p}
          onClose={() => setModal(null)}
          onSaved={() => {
            toast("Project updated");
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal?.type === "deleteTask" && (
        <ConfirmDialog
          title="Delete this task?"
          message={`"${modal.task.name}" will be permanently deleted.`}
          confirmLabel="Delete task"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await api.deleteTask(modal.task.id);
            toast("Task deleted");
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal?.type === "deleteProject" && (
        <ConfirmDialog
          title="Delete this project?"
          message={`"${p.name}" and all ${p.task_count} of its tasks will be permanently deleted.`}
          confirmLabel="Delete project"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await api.deleteProject(p.id);
            toast("Project deleted");
            navigate("/projects", { replace: true });
          }}
        />
      )}
    </>
  );
}
