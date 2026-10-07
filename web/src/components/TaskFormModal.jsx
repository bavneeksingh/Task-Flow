import { useState } from "react";
import { api } from "../api/client";
import { PRIORITIES, TASK_STATUSES } from "../utils/format";
import { hasErrors, validateTask } from "../utils/validators";
import Field from "./Field";
import Modal from "./Modal";
import { FormError } from "./States";

export default function TaskFormModal({ projectId, task, onSaved, onClose }) {
  const editing = Boolean(task);
  const [form, setForm] = useState({
    name: task?.name ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "Medium",
    status: task?.status ?? "Pending",
    due_date: task?.due_date ?? "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validateTask(form);
    setErrors(v);
    setFormError("");
    if (hasErrors(v)) return;

    const body = { ...form, name: form.name.trim(), due_date: form.due_date || null };
    setBusy(true);
    try {
      const saved = editing ? await api.updateTask(task.id, body) : await api.createTask(projectId, body);
      onSaved(saved);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError>{formError}</FormError>
        <Field label="Task name" error={errors.name}>
          <input value={form.name} onChange={set("name")} maxLength={160} autoFocus />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea value={form.description} onChange={set("description")} rows={3} />
        </Field>
        <div className="row-2">
          <Field label="Priority" error={errors.priority}>
            <select value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Status" error={errors.status}>
            <select value={form.status} onChange={set("status")}>
              {TASK_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Due date" error={errors.due_date}>
          <input type="date" value={form.due_date} onChange={set("due_date")} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
