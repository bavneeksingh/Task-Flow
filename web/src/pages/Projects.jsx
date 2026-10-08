import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/Badge";
import ProjectFormModal from "../components/ProjectFormModal";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import StatusRibbon from "../components/StatusRibbon";
import { useToast } from "../context/ToastContext";
import { useAsync, useDebounce } from "../hooks/useAsync";
import { PROJECT_STATUSES, formatDate } from "../utils/format";

export default function Projects() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  
  const setSearch = (val) => {
    if (val) searchParams.set("search", val); else searchParams.delete("search");
    setSearchParams(searchParams);
  };
  const setStatus = (val) => {
    if (val) searchParams.set("status", val); else searchParams.delete("status");
    setSearchParams(searchParams);
  };

  const [creating, setCreating] = useState(false);
  const debounced = useDebounce(search); // wait for a pause in typing before querying

  const { data: projects, error, loading, reload } = useAsync(
    () => api.listProjects({ search: debounced.trim(), status }),
    [debounced, status]
  );

  const filtering = Boolean(debounced.trim() || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>📁 Projects</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            {projects ? `${projects.length} project${projects.length === 1 ? "" : "s"}${filtering ? " found" : ""}` : "Loading…"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New project
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="🔍 Search projects by name…"
          aria-label="Search projects by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {!projects && loading && <Spinner label="Loading projects" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {projects && projects.length === 0 && !error && (
        <EmptyState
          title={filtering ? "No projects match" : "No projects yet"}
          action={
            filtering ? (
              <button className="btn" onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setCreating(true)}>Create your first project</button>
            )
          }
        >
          {filtering ? "Try a different name or status." : "Projects hold your tasks. Start with one."}
        </EmptyState>
      )}

      {projects && projects.length > 0 && (
        <ul className={`rows${loading ? " is-stale" : ""}`}>
          {projects.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="row-link" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="row-main">
                  <span className="row-title">{p.name}</span>
                  {p.description && <p className="row-desc">{p.description}</p>}
                  {(p.start_date || p.end_date) && (
                    <p className="muted small" style={{ marginTop: 4 }}>
                      📅 {p.start_date ? formatDate(p.start_date) : "No start"} → {p.end_date ? formatDate(p.end_date) : "no end"}
                    </p>
                  )}
                </div>
                <StatusBadge status={p.status} />
                <div className="row-ribbon">
                  <StatusRibbon pending={p.pending_count} inProgress={p.in_progress_count} completed={p.completed_count} />
                  <span className="muted small">
                    {p.task_count === 0 ? "No tasks" : `${p.completed_count}/${p.task_count} done`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast("Project created");
            reload();
          }}
        />
      )}
    </>
  );
}
