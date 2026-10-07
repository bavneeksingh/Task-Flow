import { useState } from "react";
import Modal from "./Modal";
import { FormError } from "./States";

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} narrow>
      <p className="muted">{message}</p>
      <FormError>{error}</FormError>
      <div className="modal-actions">
        <button className="btn btn-quiet" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={go} disabled={busy}>
          {busy ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
