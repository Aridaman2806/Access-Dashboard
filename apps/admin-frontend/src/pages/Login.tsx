import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { Button, Input } from "../components/ui.js";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <form onSubmit={handleSubmit} className="w-80 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-4 text-lg font-semibold">MCP Access Admin</h1>
        <div className="mb-3 flex flex-col gap-1">
          <label className="text-sm text-neutral-600 dark:text-neutral-400">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm text-neutral-600 dark:text-neutral-400">Password</label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <Button type="submit">Log in</Button>
      </form>
    </div>
  );
}
