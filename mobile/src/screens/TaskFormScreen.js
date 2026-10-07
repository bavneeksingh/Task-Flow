import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { api } from "../api/client";
import { Banner, Button, ChipGroup, TextField } from "../components/ui";
import { colors } from "../theme";
import { PRIORITIES, TASK_STATUSES, validateTask } from "../utils/format";

export default function TaskFormScreen({ route, navigation }) {
  const { projectId, task } = route.params;
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
  const [deleting, setDeleting] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const v = validateTask(form);
    setErrors(v);
    setFormError("");
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const body = { ...form, name: form.name.trim(), due_date: form.due_date.trim() || null };
      if (editing) await api.updateTask(task.id, body);
      else await api.createTask(projectId, body);
      navigation.goBack(); // the previous screen reloads on focus
    } catch (e) {
      if (e.fields) setErrors(e.fields);
      else setFormError(e.message);
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert("Delete this task?", `"${task.name}" will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await api.deleteTask(task.id);
            navigation.goBack();
          } catch (e) {
            setFormError(e.message);
            setDeleting(false);
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Banner>{formError}</Banner>
        <TextField label="Task name" value={form.name} onChangeText={set("name")} error={errors.name} maxLength={160} />
        <TextField label="Description" value={form.description} onChangeText={set("description")} error={errors.description} multiline numberOfLines={3} style={{ minHeight: 88, textAlignVertical: "top" }} />
        <ChipGroup label="Priority" options={PRIORITIES} value={form.priority} onChange={set("priority")} />
        <ChipGroup label="Status" options={TASK_STATUSES} value={form.status} onChange={set("status")} />
        <View style={{ height: 4 }} />
        <TextField
          label="Due date (optional)"
          value={form.due_date}
          onChangeText={set("due_date")}
          error={errors.due_date}
          hint="Format: YYYY-MM-DD"
          placeholder="2026-12-31"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Button title={editing ? "Save changes" : "Add task"} onPress={save} loading={busy} disabled={deleting} />
        {editing && <Button title="Delete task" variant="danger" onPress={confirmDelete} loading={deleting} disabled={busy} style={{ marginTop: 12 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ scroll: { padding: 16, paddingBottom: 40 } });
