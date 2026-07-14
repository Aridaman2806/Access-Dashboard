import { useEffect, useState } from "react";
import { api, type PermissionResult, type Project, type User } from "../../api/client.js";
import { Badge, Card, Input, reasonTone } from "../../components/ui.js";

interface UserAccessView {
  user: User;
  projects: Project[];
  permissions: PermissionResult[];
}

export function UserView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<UserAccessView | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api.get<User[]>(`/users?q=${encodeURIComponent(query)}`).then(setResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (selected) api.get<UserAccessView>(`/users/${encodeURIComponent(selected)}/access`).then(setView);
  }, [selected]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">User View</h1>
      <p className="text-sm text-neutral-500">Search a user to see their department, project memberships, and every tool they can access.</p>

      <div className="flex gap-4">
        <Card title="Users">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email or name…" className="mb-3 w-64" />
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {results.map((u) => (
              <li key={u.email}>
                <button
                  onClick={() => setSelected(u.email)}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    selected === u.email ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  {u.name} — {u.email}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {view && (
          <div className="flex flex-1 flex-col gap-4">
            <Card title={view.user.name}>
              <p className="text-sm">
                {view.user.email} {view.user.department && <Badge>{view.user.department}</Badge>}
              </p>
            </Card>

            <Card title={`Project memberships (${view.projects.length})`}>
              <div className="flex flex-wrap gap-2">
                {view.projects.map((p) => (
                  <Badge key={p.code}>
                    {p.name} ({p.code})
                  </Badge>
                ))}
                {view.projects.length === 0 && <span className="text-sm text-neutral-500">No project memberships.</span>}
              </div>
            </Card>

            <Card title="Effective tool permissions">
              <table className="w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="pb-2">Tool</th>
                    <th className="pb-2">Access</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {view.permissions.map((p) => (
                    <tr key={p.tool} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 font-mono">{p.tool}</td>
                      <td className="py-2">
                        <Badge tone={p.allowed ? "green" : "red"}>{p.allowed ? "Allowed" : "Denied"}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge tone={reasonTone(p.reason)}>
                          {p.reason}
                          {p.matchedProjectCode ? ` (${p.matchedProjectCode})` : ""}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
