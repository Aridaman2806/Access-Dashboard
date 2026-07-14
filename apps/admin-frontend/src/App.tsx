import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./pages/Login.js";
import { Dashboard } from "./pages/Dashboard.js";
import { ToolRegistry } from "./pages/ToolRegistry.js";
import { UserAccess } from "./pages/UserAccess.js";
import { Projects } from "./pages/Projects.js";
import { AuditLog } from "./pages/AuditLog.js";
import { ToolView } from "./pages/views/ToolView.js";
import { UserView } from "./pages/views/UserView.js";
import { ProjectView } from "./pages/views/ProjectView.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { email, loading } = useAuth();
  if (loading) return <p className="p-6">Loading…</p>;
  if (!email) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/tools" element={<ToolRegistry />} />
            <Route path="/users" element={<UserAccess />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/views/tool" element={<ToolView />} />
            <Route path="/views/user" element={<UserView />} />
            <Route path="/views/project" element={<ProjectView />} />
            <Route path="/audit-log" element={<AuditLog />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
