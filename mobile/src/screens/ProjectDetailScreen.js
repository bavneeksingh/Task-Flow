import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api/client";
import { Button, ChipGroup, EmptyState, ErrorState, Loading, PriorityBadge, StatusBadge, StatusRibbon } from "../components/ui";
import { useAsync, useDebounce, usePullToRefresh } from "../hooks/useAsync";
import { colors, radius } from "../theme";
import { PRIORITIES, TASK_STATUSES, formatDate, isOverdue } from "../utils/format";

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const debounced = useDebounce(search);

  const project = useAsync(() => api.getProject(projectId), [projectId]);
  const tasks = useAsync(
    () => api.listTasks(projectId, { search: debounced.trim(), status, priority }),
    [projectId, debounced, status, priority]
  );

  const reloadAll = () => Promise.all([project.reload(), tasks.reload()]);
  const { refreshing, onRefresh } = usePullToRefresh(reloadAll);

  const toggleDone = async (t) => {
    setBusyId(t.id);
    setActionError(null);
    try {
      await api.updateTask(t.id, { status: t.status === "Completed" ? "Pending" : "Completed" });
      await reloadAll();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusyId(null);
    }
  };

  const p = project.data;
  if (!p && project.loading) return <Loading label="Loading project" />;
  if (!p && project.error) return <ErrorState error={project.error} onRetry={project.reload} />;

  const filtering = Boolean(debounced.trim() || status || priority);

  // A React element (not an inline component) so the search box keeps focus while typing.
  const header = (
    <View>
      <View style={styles.head}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <StatusBadge status={p.status} />
          {(p.start_date || p.end_date) && (
            <Text style={styles.muted}>
              {p.start_date ? formatDate(p.start_date) : "No start"} to {p.end_date ? formatDate(p.end_date) : "no end"}
            </Text>
          )}
        </View>
        {p.description ? <Text style={styles.desc}>{p.description}</Text> : null}
        <StatusRibbon tall pending={p.pending_count} inProgress={p.in_progress_count} completed={p.completed_count} />
        <Text style={styles.muted}>
          {p.completed_count} completed, {p.in_progress_count} in progress, {p.pending_count} pending
        </Text>
      </View>

      <Button title="Add task" onPress={() => navigation.navigate("TaskForm", { projectId: p.id })} style={{ marginBottom: 16 }} />

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search tasks by name"
        placeholderTextColor="#8A93A5"
        accessibilityLabel="Search tasks by name"
        returnKeyType="search"
        autoCapitalize="none"
        style={styles.search}
      />
      <ChipGroup label="Status" options={TASK_STATUSES} value={status} onChange={setStatus} allLabel="All" />
      <ChipGroup label="Priority" options={PRIORITIES} value={priority} onChange={setPriority} allLabel="All" />

      {tasks.error && <ErrorState error={tasks.error} onRetry={tasks.reload} />}
      {actionError && <ErrorState error={actionError} />}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      data={tasks.data || []}
      keyExtractor={(t) => String(t.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        tasks.loading ? (
          <Loading label="Loading tasks" />
        ) : tasks.error ? null : (
          <EmptyState title={filtering ? "No tasks match" : "No tasks yet"}>
            {filtering ? "Try different filters." : "Tap Add task to break this project into steps."}
          </EmptyState>
        )
      }
      renderItem={({ item: t }) => {
        const done = t.status === "Completed";
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit task ${t.name}`}
            onPress={() => navigation.navigate("TaskForm", { projectId: p.id, task: t })}
            style={({ pressed }) => [styles.task, pressed && { opacity: 0.85 }, tasks.loading && { opacity: 0.6 }]}
          >
            <Pressable
              hitSlop={10}
              disabled={busyId === t.id}
              onPress={() => toggleDone(t)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done, busy: busyId === t.id }}
              accessibilityLabel={done ? `Mark ${t.name} as pending` : `Mark ${t.name} as completed`}
              style={[styles.check, done && styles.checkOn]}
            >
              {done && <Text style={styles.tick}>✓</Text>}
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.taskName, done && styles.taskDone]}>{t.name}</Text>
              {t.description ? <Text numberOfLines={2} style={styles.desc}>{t.description}</Text> : null}
              <View style={styles.row}>
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
                {t.due_date ? (
                  <Text style={[styles.muted, isOverdue(t) && { color: colors.danger, fontWeight: "600" }]}>
                    {isOverdue(t) ? "Overdue, " : ""}due {formatDate(t.due_date)}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  head: { gap: 10, marginBottom: 16 },
  muted: { color: colors.muted, fontSize: 13 },
  desc: { color: "#3B4458" },
  search: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius, paddingHorizontal: 12, fontSize: 16, backgroundColor: colors.surface, color: colors.ink, marginBottom: 12 },
  task: { flexDirection: "row", gap: 12, backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 14 },
  taskName: { fontWeight: "700", fontSize: 16, color: colors.ink },
  taskDone: { color: colors.muted, textDecorationLine: "line-through" },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  check: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: "#9AA3B5", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkOn: { backgroundColor: colors.done, borderColor: colors.done },
  tick: { color: "#fff", fontWeight: "800", fontSize: 15, lineHeight: 18 },
});
