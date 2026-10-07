import { Children, cloneElement, useId } from "react";

// Wires a label, an input and its error message together for screen readers.
export default function Field({ label, error, hint, children }) {
  const id = useId();
  const errId = `${id}-err`;
  const child = Children.only(children);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(child, {
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? errId : undefined,
      })}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p id={errId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
