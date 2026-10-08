import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/Badge";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import { useAsync } from "../hooks/useAsync";

export default function Calendar() {
  const toLocalISO = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(toLocalISO(new Date()));

  // Fetch all tasks for the user
  const { data: tasks, error, loading, reload } = useAsync(() => api.listAllTasks(), []);

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateStr = toLocalISO(new Date(year, month - 1, d));
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = toLocalISO(new Date(year, month, i));
      days.push({ day: i, dateStr, isCurrentMonth: true });
    }
    
    // Next month padding
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    while (days.length < totalCells) {
      const dateStr = toLocalISO(new Date(year, month + 1, nextMonthDay));
      days.push({ day: nextMonthDay, dateStr, isCurrentMonth: false });
      nextMonthDay++;
    }
    
    return days;
  }, [year, month, daysInMonth, startingDayOfWeek]);

  // Map tasks by date
  const tasksByDate = useMemo(() => {
    if (!tasks) return {};
    const map = {};
    tasks.forEach(t => {
      if (t.due_date) {
        // Just take the date part
        const d = t.due_date.split("T")[0];
        if (!map[d]) map[d] = [];
        map[d].push(t);
      }
    });
    return map;
  }, [tasks]);

  const selectedTasks = tasksByDate[selectedDateStr] || [];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>📅 Calendar</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            View and manage your tasks by due date
          </p>
        </div>
      </div>

      {loading && !tasks && <Spinner label="Loading tasks..." />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {tasks && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Left: Calendar View */}
          <div className="panel" style={{ flex: '1 1 320px', minWidth: 0, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{monthName} {year}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-sm btn-quiet" style={{ padding: '6px 12px' }} onClick={handlePrevMonth}>
                  &larr; Prev
                </button>
                <button className="btn btn-sm btn-quiet" style={{ padding: '6px 12px' }} onClick={handleNextMonth}>
                  Next &rarr;
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="muted small" style={{ fontWeight: 700, fontSize: '0.75rem' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {calendarDays.map((d, i) => {
                const isSelected = d.dateStr === selectedDateStr;
                const isToday = d.dateStr === toLocalISO(new Date());
                const dayTasks = tasksByDate[d.dateStr] || [];
                
                return (
                  <button 
                    key={i}
                    onClick={() => setSelectedDateStr(d.dateStr)}
                    style={{
                      aspectRatio: '1',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary-dark)' : (isToday ? 'var(--pastel-yellow)' : 'var(--bg-surface)'),
                      color: isSelected ? '#fff' : (d.isCurrentMonth ? 'var(--ink)' : 'var(--ink-subtle)'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '4px',
                      position: 'relative',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                      transition: 'all 0.2s ease',
                      border: isSelected ? 'none' : '1px solid var(--line)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span style={{ fontWeight: isSelected || isToday ? 700 : 500 }}>{d.day}</span>
                    
                    {/* Task indicators */}
                    {dayTasks.length > 0 && (
                      <div style={{ display: 'flex', gap: '3px', marginTop: 'auto', paddingBottom: '4px' }}>
                        {dayTasks.slice(0, 3).map((t, idx) => {
                          let dotColor = 'var(--todo)';
                          if (t.status === "In Progress") dotColor = 'var(--doing)';
                          if (t.status === "Completed") dotColor = 'var(--done)';
                          
                          // If selected, maybe make dots white for contrast
                          if (isSelected) dotColor = '#fff';

                          return (
                            <span key={idx} style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, opacity: isSelected ? 0.8 : 1 }} />
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <span style={{ fontSize: '10px', lineHeight: '6px', color: isSelected ? '#fff' : 'var(--ink-muted)' }}>+</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Tasks for Selected Date */}
          <div className="panel" style={{ flex: '1 1 320px', minWidth: 0, marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Tasks for {
              (() => {
                const [y, m, d] = selectedDateStr.split("-").map(Number);
                return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              })()
            }</h2>
            <p className="muted small" style={{ marginBottom: '24px' }}>
              {selectedTasks.length === 0 ? "You have a free day!" : `You have ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} scheduled.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
              {selectedTasks.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)' }}>
                   <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏖️</div>
                   No tasks due on this date.
                 </div>
              ) : (
                selectedTasks.map(t => (
                  <div key={t.id} style={{ 
                    padding: '16px', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--line-strong)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: t.status === "Completed" ? 'var(--ink-subtle)' : 'var(--ink)', textDecoration: t.status === "Completed" ? 'line-through' : 'none' }}>
                        {t.name}
                      </div>
                      {t.description && (
                        <div className="muted small" style={{ marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {t.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <StatusBadge status={t.status} />
                      <Link to={`/projects/${t.project_id}`} className="btn btn-sm btn-quiet" style={{ padding: '4px 8px' }}>View Project &rarr;</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </>
  );
}
