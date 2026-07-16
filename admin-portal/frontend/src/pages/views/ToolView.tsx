import { useEffect, useState } from "react";
import { api, type Grant, type Tool, type User } from "../../api/client.js";
import { Badge, Card, Input } from "../../components/ui.js";

interface ToolAccessView {
  tool: Tool;
  departmentTags: string[];
  usersViaDepartment: User[];
  individualGrants: Grant[];
  projectGrants: (Grant & { project?: { code: string; name: string }; memberCount: number })[];
}

export function ToolView() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<ToolAccessView | null>(null);

  useEffect(() => {
    api.get<Tool[]>("/tools").then(setTools);
  }, []);

  useEffect(() => {
    if (selected) api.get<ToolAccessView>(`/tools/${encodeURIComponent(selected)}/access`).then(setView);
  }, [selected]);

  const filtered = tools.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Tool View</h1>
      <p className="text-sm text-neutral-500">Search a tool to see every user who has access, and why.</p>

      <div className="flex gap-4">
        <Card title="Tools">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools…" className="mb-3 w-56" />
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {filtered.map((t) => (
              <li key={t.name}>
                <button
                  onClick={() => setSelected(t.name)}
                  className={`w-full rounded px-3 py-2 text-left font-mono text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    selected === t.name ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {view && (
          <div className="flex flex-1 flex-col gap-4">
            <Card title={`${view.tool.name}`}>
              <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">{view.tool.description}</p>
              <div className="flex flex-wrap gap-1">
                {view.departmentTags.length ? (
                  view.departmentTags.map((t) => <Badge key={t}>{t}</Badge>)
                ) : (
                  <Badge tone="red">untagged — deny-by-default</Badge>
                )}
              </div>
            </Card>

            <Card title={`Access via department tag (${view.usersViaDepartment.length})`}>
              <ul className="flex flex-col gap-1 text-sm">
                {view.usersViaDepartment.map((u) => (
                  <li key={u.email}>
                    {u.name} — {u.email} <Badge>{u.department}</Badge>
                  </li>
                ))}
                {view.usersViaDepartment.length === 0 && <li className="text-neutral-500">No users match this tool's department tags.</li>}
              </ul>
            </Card>

            <Card title={`Individual grants (${view.individualGrants.length})`}>
              <ul className="flex flex-col gap-1 text-sm">
                {view.individualGrants.map((g) => (
                  <li key={g.id}>
                    {g.user_email} — granted by {g.granted_by} on {new Date(g.granted_at).toLocaleDateString()}
                  </li>
                ))}
                {view.individualGrants.length === 0 && <li className="text-neutral-500">No individual grants.</li>}
              </ul>
            </Card>

            <Card title={`Project grants (${view.projectGrants.length})`}>
              <ul className="flex flex-col gap-1 text-sm">
                {view.projectGrants.map((g) => (
                  <li key={g.id}>
                    {g.project?.name ?? g.project_code} ({g.project_code}) — {g.memberCount} member(s)
                  </li>
                ))}
                {view.projectGrants.length === 0 && <li className="text-neutral-500">No project grants.</li>}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
