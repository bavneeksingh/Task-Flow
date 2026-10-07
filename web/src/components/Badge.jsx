import { slug } from "../utils/format";

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${slug(status)}`}>
      <span className="dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return <span className={`prio prio-${priority.toLowerCase()}`}>{priority}</span>;
}
