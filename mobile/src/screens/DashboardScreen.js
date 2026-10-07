import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ErrorState, Loading, StatusRibbon } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { usePullToRefresh, useAsync } from "../hooks/useAsync";
import { colors, radius } from "../theme";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data: s, error, loading, reload } = useAsync(() => api.dashboard(), []);
  const { refreshing, onRefresh } = usePullToRefresh(reload);

  if (!s && loading) return <Loading label="Loading dashboard" />;
  if (!s && error) return <ErrorState error={error} onRetry={reload} />;

  const cells = [
    ["Projects", s.total_projects],
    ["Projects in progress", s.projects_in_progress],
    ["Tasks", s.total_tasks],
    ["Completed tasks", s.completed_tasks],
    ["Pending tasks", s.pending_tasks],
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.hello}>Hi, {user.full_name.split(" ")[0]}</Text>
      {error && <ErrorState error={error} onRetry={reload} />}

      <View style={styles.grid}>
        {cells.map(([label, value]) => (
          <View key={label} style={styles.cell} accessible accessibilityLabel={`${label}: ${value}`}>
            <Text style={styles.cellLabel}>{label}</Text>
            <Text style={styles.cellValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>All tasks</Text>
        <StatusRibbon tall pending={s.pending_tasks} inProgress={s.in_progress_tasks} completed={s.completed_tasks} />
        <View style={styles.legend}>
          <Legend color={colors.done} text={`${s.completed_tasks} completed`} />
          <Legend color={colors.doing} text={`${s.in_progress_tasks} in progress`} />
          <Legend color={colors.todo} text={`${s.pending_tasks} pending`} />
        </View>
      </View>
      <Text style={styles.pullHint}>Pull down to refresh</Text>
    </ScrollView>
  );
}

const Legend = ({ color, text }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
    <Text style={{ color: colors.muted }}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  hello: { fontSize: 28, fontWeight: "800", color: colors.ink, marginBottom: 16, letterSpacing: -0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  cell: { flexGrow: 1, flexBasis: "45%", backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 16 },
  cellLabel: { color: colors.muted, fontSize: 14 },
  cellValue: { fontSize: 30, fontWeight: "800", color: colors.ink, marginTop: 2 },
  panel: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 16 },
  panelTitle: { fontWeight: "700", fontSize: 17, marginBottom: 12, color: colors.ink },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12 },
  pullHint: { textAlign: "center", color: colors.muted, marginTop: 16, fontSize: 13 },
});
