// A single bar split into completed / in progress / pending, so progress reads at a glance.
export default function StatusRibbon({ pending = 0, inProgress = 0, completed = 0, tall = false }) {
  const total = pending + inProgress + completed;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const label = total
    ? `${completed} of ${total} tasks completed, ${inProgress} in progress, ${pending} pending`
    : "No tasks yet";
  return (
    <div className={`ribbon${tall ? " ribbon-tall" : ""}`} role="img" aria-label={label}>
      <span className="seg seg-done" style={{ width: `${pct(completed)}%` }} />
      <span className="seg seg-doing" style={{ width: `${pct(inProgress)}%` }} />
      <span className="seg seg-todo" style={{ width: `${pct(pending)}%` }} />
    </div>
  );
}
