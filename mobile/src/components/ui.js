import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "../theme";

export function Button({ title, onPress, variant = "primary", loading, disabled, style }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" && s.btnPrimary,
        variant === "danger" && s.btnDanger,
        variant === "quiet" && s.btnQuiet,
        off && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "quiet" ? colors.ink : "#fff"} />
      ) : (
        <Text style={[s.btnText, variant === "quiet" && { color: colors.ink }, variant === "danger" && { color: "#fff" }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({ label, error, hint, style, ...props }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8A93A5"
        accessibilityLabel={label}
        style={[s.input, error && { borderColor: colors.danger }, style]}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

// A row of tappable options. With `allLabel` it behaves as a filter ("All" clears it).
export function ChipGroup({ label, options, value, onChange, allLabel }) {
  const items = allLabel ? [{ label: allLabel, value: "" }, ...options.map((o) => ({ label: o, value: o }))] : options.map((o) => ({ label: o, value: o }));
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
        {items.map((it) => {
          const on = it.value === value;
          return (
            <Pressable
              key={it.label}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label ? label + ": " : ""}${it.label}`}
              onPress={() => onChange(it.value)}
              style={[s.chip, on && s.chipOn]}
            >
              <Text style={[s.chipText, on && { color: "#fff" }]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const statusColor = { "Not Started": colors.todo, Pending: colors.todo, "In Progress": colors.doing, Completed: colors.done };

export function StatusBadge({ status }) {
  return (
    <View style={s.badgeRow}>
      <View style={[s.dot, { backgroundColor: statusColor[status] }]} />
      <Text style={s.badgeText}>{status}</Text>
    </View>
  );
}

export function PriorityBadge({ priority }) {
  const tone = priority === "High" ? { c: colors.danger, bg: colors.dangerSoft } : priority === "Medium" ? { c: "#8A5A00", bg: "#FDF4DC" } : { c: colors.muted, bg: "#fff" };
  return (
    <View style={[s.prio, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.c, fontSize: 12, fontWeight: "600" }}>{priority}</Text>
    </View>
  );
}

export function StatusRibbon({ pending = 0, inProgress = 0, completed = 0, tall }) {
  const total = pending + inProgress + completed;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={total ? `${completed} of ${total} tasks completed, ${inProgress} in progress, ${pending} pending` : "No tasks yet"}
      style={[s.ribbon, tall && { height: 14, borderRadius: 7 }]}
    >
      {completed > 0 && <View style={{ flex: completed, backgroundColor: colors.done }} />}
      {inProgress > 0 && <View style={{ flex: inProgress, backgroundColor: colors.doing }} />}
      {pending > 0 && <View style={{ flex: pending, backgroundColor: colors.todo }} />}
    </View>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <View style={s.center} accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  const offline = error?.code === "network";
  return (
    <View style={s.stateErr} accessibilityRole="alert">
      <Text style={s.stateTitleErr}>{offline ? "You seem to be offline" : "Something went wrong"}</Text>
      <Text style={s.stateText}>{error?.message || "Please try again."}</Text>
      {onRetry ? <Button title="Try again" variant="quiet" onPress={onRetry} style={{ alignSelf: "center" }} /> : null}
    </View>
  );
}

export function EmptyState({ title, children }) {
  return (
    <View style={s.state}>
      <Text style={s.stateTitle}>{title}</Text>
      {children ? <Text style={s.stateText}>{children}</Text> : null}
    </View>
  );
}

export function Banner({ kind = "error", children }) {
  if (!children) return null;
  const err = kind === "error";
  return (
    <View accessibilityRole="alert" style={[s.banner, { backgroundColor: err ? colors.dangerSoft : colors.accentSoft, borderColor: err ? "#F1C3BE" : "#C9D0FA" }]}>
      <Text style={{ color: err ? colors.danger : "#1D2CAB" }}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  btn: { minHeight: 48, borderRadius: radius, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  btnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  btnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  btnQuiet: { backgroundColor: "transparent" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  field: { marginBottom: 16 },
  label: { fontWeight: "600", fontSize: 14, marginBottom: 6, color: colors.ink },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: colors.surface, color: colors.ink },
  error: { color: colors.danger, marginTop: 6, fontSize: 13 },
  hint: { color: colors.muted, marginTop: 6, fontSize: 13 },
  chip: { minHeight: 36, paddingHorizontal: 14, justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontWeight: "600", color: colors.ink },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  badgeText: { fontWeight: "600", fontSize: 13, color: colors.ink },
  prio: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  ribbon: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.lineSoft },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  state: { alignItems: "center", padding: 28, margin: 16, borderRadius: radius, borderWidth: 1, borderStyle: "dashed", borderColor: "#B8C0D0", backgroundColor: colors.surface },
  stateErr: { alignItems: "center", padding: 24, margin: 16, borderRadius: radius, borderWidth: 1, borderColor: "#F1C3BE", backgroundColor: colors.dangerSoft },
  stateTitle: { fontWeight: "700", fontSize: 17, marginBottom: 6, color: colors.ink },
  stateTitleErr: { fontWeight: "700", fontSize: 17, marginBottom: 6, color: colors.danger },
  stateText: { color: colors.muted, textAlign: "center", marginBottom: 8 },
  banner: { padding: 12, borderRadius: radius, borderWidth: 1, marginBottom: 16 },
});
