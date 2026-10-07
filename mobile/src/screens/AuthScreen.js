import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Button, TextField } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import { validateLogin, validateRegister } from "../utils/format";

export default function AuthScreen({ navigation, mode }) {
  const isRegister = mode === "register";
  const { login, register, notice } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const v = isRegister ? validateRegister(form) : validateLogin(form);
    setErrors(v);
    setFormError("");
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const email = form.email.trim();
      if (isRegister) await register({ full_name: form.full_name.trim(), email, password: form.password });
      else await login({ email, password: form.password });
      // On success the root navigator swaps to the signed-in screens by itself.
    } catch (e) {
      if (e.fields) setErrors(e.fields);
      else setFormError(e.message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>TaskFlow</Text>
          <Text style={styles.tag}>Your projects and tasks, in step with the web.</Text>

          <Text style={styles.title}>{isRegister ? "Create your account" : "Log in"}</Text>
          {!isRegister && <Banner kind="notice">{notice}</Banner>}
          <Banner>{formError}</Banner>

          {isRegister && (
            <TextField label="Full name" value={form.full_name} onChangeText={set("full_name")} error={errors.full_name} autoComplete="name" textContentType="name" />
          )}
          <TextField
            label="Email address"
            value={form.email}
            onChangeText={set("email")}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={form.password}
            onChangeText={set("password")}
            error={errors.password}
            hint={isRegister ? "At least 8 characters." : undefined}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isRegister ? "new-password" : "current-password"}
            textContentType={isRegister ? "newPassword" : "password"}
            onSubmitEditing={submit}
          />
          <Button title={isRegister ? "Create account" : "Log in"} onPress={submit} loading={busy} />

          <Pressable onPress={() => navigation.replace(isRegister ? "Login" : "Register")} style={{ marginTop: 20, padding: 8 }}>
            <Text style={styles.switch}>
              {isRegister ? "Already have an account? " : "New here? "}
              <Text style={{ color: colors.accent, fontWeight: "600" }}>{isRegister ? "Log in" : "Create an account"}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 24, paddingTop: 48 },
  brand: { fontSize: 38, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  tag: { color: colors.muted, fontSize: 16, marginTop: 4, marginBottom: 36 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 16 },
  switch: { textAlign: "center", color: colors.muted },
});
