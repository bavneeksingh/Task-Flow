import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { EmptyState, ErrorState, Loading, StatusBadge, StatusRibbon } from "../components/ui";
import { usePullToRefresh, useAsync } from "../hooks/useAsync";
import { colors, radius } from "../theme";

export default function ProjectsScreen({ navigation }) {
  const { data: projects, error, loading, reload } = useAsync(() => api.listProjects(), []);
  const { refreshing, onRefresh } = usePullToRefresh(reload);

  if (!projects && loading) return <Loading label="Loading projects" />;
  if (!projects && error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
      data={projects}
      keyExtractor={(p) => String(p.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={error ? <ErrorState error={error} onRetry={reload} /> : null}
      ListEmptyComponent={
        <EmptyState title="No projects yet">Create projects on the web app and they will show up here after a pull-to-refresh.</EmptyState>
      }
      renderItem={({ item: p }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${p.status}, ${p.completed_count} of ${p.task_count} tasks done`}
          onPress={() => navigation.navigate("ProjectDetail", { projectId: p.id, name: p.name })}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.name}>{p.name}</Text>
          {p.description ? <Text numberOfLines={2} style={styles.desc}>{p.description}</Text> : null}
          <View style={styles.meta}>
            <StatusBadge status={p.status} />
            <Text style={styles.count}>{p.task_count === 0 ? "No tasks" : `${p.completed_count}/${p.task_count} done`}</Text>
          </View>
          <StatusRibbon pending={p.pending_count} inProgress={p.in_progress_count} completed={p.completed_count} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 10 },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  desc: { color: "#3B4458" },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { color: colors.muted, fontSize: 13 },
});
