import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { EmptyState, ErrorState, Spinner } from "./components/States";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "./pages/Projects";
import Calendar from "./pages/Calendar";
import TaskList from "./pages/TaskList";

function RequireAuth({ children }) {
  const { user, booting, bootError, retryBoot } = useAuth();
  const location = useLocation();
  if (booting) return <Spinner label="Restoring your session" />;
  if (bootError) return <ErrorState error={bootError} onRetry={retryBoot} />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="tasks" element={<TaskList />} />
      </Route>
      <Route
        path="*"
        element={
          <EmptyState title="Page not found" action={<Link className="btn" to="/">Go home</Link>}>
            That address doesn't exist.
          </EmptyState>
        }
      />
    </Routes>
  );
}
