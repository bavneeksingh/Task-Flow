import { useEffect, useId, useRef } from "react";

// Uses the browser's native <dialog>: it traps focus, closes on Esc, and marks the
// rest of the page inert for us, which is hard to get right by hand.
export default function Modal({ title, onClose, children, narrow = false }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal${narrow ? " modal-narrow" : ""}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onMouseDown={(e) => e.target === ref.current && ref.current.close()} // click on the backdrop
    >
      <div className="modal-body">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
