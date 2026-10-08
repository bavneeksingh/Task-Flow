import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/Badge";
import ProjectFormModal from "../components/ProjectFormModal";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import StatusRibbon from "../components/StatusRibbon";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { formatDate } from "../utils/format";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  
  const { data, error, loading, reload } = useAsync(
    async () => {
      const [stats, active, allProjects, allTasks] = await Promise.all([
        api.dashboard(),
        api.listProjects({ status: "In Progress" }),
        api.listProjects({}),
        api.listAllTasks(),
      ]);
      
      const todayStr = new Date().toISOString().split("T")[0];
      const todayTasks = allTasks
        .filter(t => t.due_date && t.due_date.startsWith(todayStr) && t.status !== "Completed")
        .slice(0, 3);
        
      const pendingTasks = allTasks.filter(t => t.status === "Pending").slice(0, 3);
      const inProgressTasks = allTasks.filter(t => t.status === "In Progress").slice(0, 3);

      return { stats, active, allProjects, todayTasks, pendingTasks, inProgressTasks };
    },
    []
  );

  if (!data && loading) return <Spinner label="Loading dashboard" />;
  if (!data && error) return <ErrorState error={error} onRetry={reload} />;

  const { stats: s, active, allProjects, todayTasks, pendingTasks, inProgressTasks } = data;
  const firstName = user.full_name.split(" ")[0];
  const completionRate = s.total_tasks > 0 ? Math.round((s.completed_tasks / s.total_tasks) * 100) : 0;

  const recentProjects = allProjects.slice(0, 3);

  // SVG Chart Math
  const radius = 84;
  const strokeWidth = 16;
  const C = Math.PI * radius; // Half circle circumference
  const totalTasks = s.total_tasks || 1;
  const doneLen = (s.completed_tasks / totalTasks) * C;
  const doingLen = (s.in_progress_tasks / totalTasks) * C;

  return (
    <>
      <div className="welcome-header">
        <h1>{getGreeting()},</h1>
        <div className="name-large">{firstName}!</div>
      </div>

      <div className="welcome-grid">
        {/* Yellow Card (Today / Schedule preview) */}
        <div className="card-pastel card-yellow" style={{ gridRow: "span 2", justifyContent: "flex-start" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "16px" }}>Today</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
             {todayTasks.length === 0 ? (
                <div className="muted small">No tasks scheduled yet. Enjoy your day!</div>
             ) : (
                todayTasks.map((t, i) => {
                  const pName = allProjects.find(p => p.id === t.project_id)?.name || "Project";
                  return (
                    <div key={t.id}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div className="muted small">{pName} • {t.due_date ? formatDate(t.due_date) : "Upcoming"}</div>
                        <div style={{ fontWeight: 700 }}>{t.name}</div>
                      </div>
                      {i < todayTasks.length - 1 && <div style={{ height: "1px", background: "rgba(0,0,0,0.05)", marginTop: "16px" }}></div>}
                    </div>
                  );
                })
             )}
          </div>
        </div>

        {/* Mint Card (To do list) */}
        <Link to="/tasks?status=Pending" className="card-pastel card-mint" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-pastel-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div className="card-pastel-title">To do list</div>
          <div className="card-pastel-sub">{s.pending_tasks} tasks</div>
        </Link>

        {/* Purple Card (In progress) */}
        <Link to="/tasks?status=In+Progress" className="card-pastel card-purple" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card-pastel-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="card-pastel-title">In progress</div>
          <div className="card-pastel-sub">{s.in_progress_tasks} tasks</div>
        </Link>
      </div>

      <div className="dashboard-grid">
        {/* Projects Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Projects</h2>
              <div className="muted small">Currently you have {s.total_projects} projects.</div>
            </div>
            <button className="btn btn-sm" style={{ borderRadius: '99px', padding: '6px 12px' }} onClick={() => setCreating(true)}>
               + Add
            </button>
          </div>
          
          <ul className="rows">
            {recentProjects.map((p) => (
              <li key={p.id} className="row-link" style={{ cursor: 'pointer', padding: '20px' }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="row-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--pastel-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                        🎨
                      </div>
                      <span className="row-title" style={{ fontSize: '1.1rem' }}>{p.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '80px' }}>
                        <StatusRibbon pending={p.pending_count} inProgress={p.in_progress_count} completed={p.completed_count} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.completed_count}/{p.task_count}</span>
                    </div>
                  </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Activity Section (Dynamic SVG Chart) */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 'auto' }}>Activity</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0' }}>
             <div style={{ position: 'relative', width: '200px', height: '100px', display: 'flex', justifyContent: 'center' }}>
                <svg width="200" height="100" viewBox="0 0 200 100" style={{ transform: 'rotate(180deg)', position: 'absolute', top: 0, left: 0 }}>
                  <circle cx="100" cy="0" r={radius} fill="none" stroke="var(--todo-bg)" strokeWidth={strokeWidth} strokeDasharray={`${C} ${C * 2}`} />
                  <circle cx="100" cy="0" r={radius} fill="none" stroke="var(--doing)" strokeWidth={strokeWidth} strokeDasharray={`${doneLen + doingLen} ${C * 2}`} />
                  <circle cx="100" cy="0" r={radius} fill="none" stroke="var(--done)" strokeWidth={strokeWidth} strokeDasharray={`${doneLen} ${C * 2}`} />
                </svg>
                <div style={{ position: 'absolute', bottom: '0', width: '100%', textAlign: 'center', paddingBottom: '8px' }}>
                  {/* Both percentage and label removed per user request */}
                </div>
             </div>
             
             <ul className="legend" style={{ marginTop: '32px', gap: '24px' }}>
                <li><span className="swatch seg-done" />Done</li>
                <li><span className="swatch seg-doing" />In progress</li>
                <li><span className="swatch seg-todo" />To do</li>
             </ul>
          </div>
        </section>
      </div>

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
