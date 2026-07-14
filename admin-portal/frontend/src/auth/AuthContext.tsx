import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client.js";

interface AuthState {
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ email: string }>("/auth/me")
      .then((r) => setEmail(r.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(loginEmail: string, password: string) {
    const r = await api.post<{ email: string }>("/auth/login", { email: loginEmail, password });
    setEmail(r.email);
  }

  async function logout() {
    await api.post("/auth/logout");
    setEmail(null);
  }

  return <AuthContext.Provider value={{ email, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
