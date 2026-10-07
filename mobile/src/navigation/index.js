import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { Button, ErrorState, Loading } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import AuthScreen from "../screens/AuthScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProjectDetailScreen from "../screens/ProjectDetailScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import TaskFormScreen from "../screens/TaskFormScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { fontWeight: "700", color: colors.ink },
  headerTintColor: colors.accent,
  headerShadowVisible: false,
};

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Log out" hitSlop={10}>
      <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 16 }}>Log out</Text>
    </Pressable>
  );
}

function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} options={{ title: "Projects" }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={({ route }) => ({ title: route.params?.name || "Project" })} />
      <Stack.Screen
        name="TaskForm"
        component={TaskFormScreen}
        options={({ route }) => ({ title: route.params?.task ? "Edit task" : "New task", presentation: "modal" })}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        ...headerStyle,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIconStyle: { display: "none" }, // text-only tabs
        tabBarLabelStyle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
      }}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ headerRight: () => <View style={{ marginRight: 16 }}><LogoutButton /></View> }} />
      <Tabs.Screen name="Projects" component={ProjectsStack} options={{ headerShown: false }} />
    </Tabs.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">{(props) => <AuthScreen {...props} mode="login" />}</Stack.Screen>
      <Stack.Screen name="Register">{(props) => <AuthScreen {...props} mode="register" />}</Stack.Screen>
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, booting, bootError, retryBoot } = useAuth();

  if (booting) return <Loading label="Restoring your session" />;
  if (bootError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.paper }}>
        <ErrorState error={bootError} onRetry={retryBoot} />
      </View>
    );
  }
  return <NavigationContainer>{user ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
