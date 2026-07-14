import { useEffect, useState } from "react";
import { api, type Grant, type Tool, type User } from "../api/client.js";
import { Badge, Button, Card, Input } from "../components/ui.js";

export function UserAccess() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [toolName, setToolName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Tool[]>("/tools").then(setTools);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      api.get<User[]>(`/users?q=${encodeURIComponent(query)}`).then(setResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function loadGrants(email: string) {
    api.get<Grant[]>(`/users/${encodeURIComponent(email)}/grants`).then(setGrants);
  }

  function selectUser(user: User) {
    setSelected(user);
    setNewEmail(user.email);
    setNewName(user.name);
    loadGrants(user.email);
  }

  async function grant() {
    setError(null);
    if (!newEmail || !toolName) {
      setError("Email and tool are required");
      return;
    }
    try {
      await api.post("/grants", { userEmail: newEmail, userName: newName || undefined, toolName });
      loadGrants(newEmail);
      setToolName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function revoke(id: string) {
    await api.del(`/grants/${id}`);
    if (selected) loadGrants(selected.email);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">User Access</h1>

      <Card title="Search users">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name…"
          className="mb-3 w-80"
        />
        <ul className="flex flex-col gap-1">
          {results.map((user) => (
            <li key={user.email}>
              <button
                onClick={() => selectUser(user)}
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  selected?.email === user.email ? "bg-neutral-100 dark:bg-neutral-800" : ""
                }`}
              >
                <span className="font-medium">{user.name}</span> — {user.email}{" "}
                {user.department && <Badge>{user.department}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Grant / revoke individual tool access">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Email</label>
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@company.com" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Name (required if new user)</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Tool</label>
            <select
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Select a tool…</option>
              {tools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => void grant()}>Grant access</Button>
        </div>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        {selected && (
          <>
            <h3 className="mb-2 text-sm font-medium">Active grants for {selected.email}</h3>
            <ul className="flex flex-col gap-1">
              {grants.map((g) => (
                <li key={g.id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                  <span className="font-mono">{g.tool_name}</span>
                  <Button variant="danger" onClick={() => void revoke(g.id)}>
                    Revoke
                  </Button>
                </li>
              ))}
              {grants.length === 0 && <li className="text-sm text-neutral-500">No active individual grants.</li>}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
