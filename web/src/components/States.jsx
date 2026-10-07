export function Spinner({ label = "Loading" }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const offline = error?.code === "network";
  return (
    <div className="state state-error" role="alert">
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {offline ? "You seem to be offline" : "Something went wrong"}
      </h3>
      <p>{error?.message || "Please try again."}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state">
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {title}
      </h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function FormError({ children }) {
  return children ? (
    <div className="form-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {children}
    </div>
  ) : null;
}
