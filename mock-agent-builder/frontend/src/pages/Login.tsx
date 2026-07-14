import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type DemoAccount } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { Button, Card, Input } from "../components/ui.js";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DemoAccount[]>("/auth/demo-accounts").then(setAccounts);
  }, []);

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
    <div className="flex min-h-svh items-center justify-center gap-8 bg-neutral-50 p-6 dark:bg-neutral-950">
      <Card title="Demo accounts">
        <p className="mb-3 max-w-xs text-sm text-neutral-500">
          Stand-in for real SSO — click a row to autofill, then log in. Whichever tools this account has access to
          (via project-code grants set up in the admin portal) will show up after login.
        </p>
        <table className="text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Password</th>
              <th className="pb-2">Name</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr
                key={a.email}
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
                className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                <td className="py-1.5 pr-4 font-mono">{a.email}</td>
                <td className="py-1.5 pr-4 font-mono">{a.password}</td>
                <td className="py-1.5">{a.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <form onSubmit={handleSubmit} className="w-80 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-4 text-lg font-semibold">Log in</h1>
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
