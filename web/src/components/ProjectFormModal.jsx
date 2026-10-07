import { useState } from "react";
import { api } from "../api/client";
import { PROJECT_STATUSES } from "../utils/format";
import { hasErrors, validateProject } from "../utils/validators";
import Field from "./Field";
import Modal from "./Modal";
import { FormError } from "./States";

export default function ProjectFormModal({ project, onSaved, onClose }) {
  const editing = Boolean(project);
  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "Not Started",
    start_date: project?.start_date ?? "",
    end_date: project?.end_date ?? "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validateProject(form);
    setErrors(v);
    setFormError("");
    if (hasErrors(v)) return;

    // Empty date inputs become null so the server stores "no date", not an empty string.
    const body = { ...form, name: form.name.trim(), start_date: form.start_date || null, end_date: form.end_date || null };
    setBusy(true);
    try {
      const saved = editing ? await api.updateProject(project.id, body) : await api.createProject(body);
      onSaved(saved);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? "Edit project" : "New project"} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError>{formError}</FormError>
        <Field label="Project name" error={errors.name}>
          <input value={form.name} onChange={set("name")} maxLength={120} autoFocus />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea value={form.description} onChange={set("description")} rows={3} />
        </Field>
        <Field label="Status" error={errors.status}>
          <select value={form.status} onChange={set("status")}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="row-2">
          <Field label="Start date" error={errors.start_date}>
            <input type="date" value={form.start_date} onChange={set("start_date")} />
          </Field>
          <Field label="End date" error={errors.end_date}>
            <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={set("end_date")} />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
