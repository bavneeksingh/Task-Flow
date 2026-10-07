import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/Badge";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../utils/format";

export default function TaskList() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "Pending";

  const { data, error, loading, reload } = useAsync(async () => {
    const [allTasks, allProjects] = await Promise.all([
      api.listAllTasks(),
      api.listProjects({})
    ]);
    
    // Filter tasks by status
    const filteredTasks = allTasks.filter(t => t.status === statusFilter);
    return { filteredTasks, allProjects };
  }, [statusFilter]);

  let title = "Tasks";
  if (statusFilter === "Pending") title = "To do list";
  if (statusFilter === "In Progress") title = "In progress tasks";
  if (statusFilter === "Completed") title = "Completed tasks";

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/" className="back" aria-label="Back to dashboard" style={{ marginBottom: '16px' }} />
          <h1>{title}</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            {data ? `${data.filteredTasks.length} task${data.filteredTasks.length === 1 ? '' : 's'}` : 'Loading...'}
          </p>
        </div>
      </div>

      {loading && !data && <Spinner label="Loading tasks..." />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.filteredTasks.length === 0 && (
        <EmptyState title={`No ${statusFilter.toLowerCase()} tasks`} action={<Link className="btn" to="/projects">View Projects</Link>}>
          You don't have any tasks in this status right now.
        </EmptyState>
      )}

      {data && data.filteredTasks.length > 0 && (
        <ul className="tasks">
          {data.filteredTasks.map((t) => {
            const project = data.allProjects.find(p => p.id === t.project_id);
            const projectName = project ? project.name : "Unknown Project";
            
            return (
              <li key={t.id} className="task">
                <div className="task-main">
                  <div className="muted small" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ padding: '2px 8px', background: 'var(--line-strong)', borderRadius: '4px', fontWeight: 600 }}>{projectName}</span>
                    {t.due_date && <span>Due: {formatDate(t.due_date)}</span>}
                  </div>
                  <div className="task-name">{t.name}</div>
                  {t.description && <div className="muted small" style={{ marginTop: '4px' }}>{t.description}</div>}
                </div>
                <StatusBadge status={t.status} />
                <Link to={`/projects/${t.project_id}`} className="btn btn-sm btn-quiet" style={{ marginLeft: 'auto' }}>
                  Open Project &rarr;
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
