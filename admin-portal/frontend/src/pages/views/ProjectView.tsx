import { useEffect, useState } from "react";
import { api, type Grant, type Project } from "../../api/client.js";
import { Badge, Card, Input } from "../../components/ui.js";

interface ProjectAccessView {
  project: Project;
  members: {
    user_email: string;
    user?: { name: string; department: string | null };
    individualGrants: Grant[];
  }[];
  toolGrants: Grant[];
}

export function ProjectView() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<ProjectAccessView | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api.get<Project[]>(`/projects?q=${encodeURIComponent(query)}`).then(setProjects);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (selected) api.get<ProjectAccessView>(`/projects/${encodeURIComponent(selected)}/access`).then(setView);
  }, [selected]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Project View</h1>
      <p className="text-sm text-neutral-500">Search a project to see its members and the tools granted to it.</p>

      <div className="flex gap-4">
        <Card title="Projects">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="mb-3 w-56" />
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {projects.map((p) => (
              <li key={p.code}>
                <button
                  onClick={() => setSelected(p.code)}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    selected === p.code ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-neutral-500">{p.code}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {view && (
          <div className="flex flex-1 flex-col gap-4">
            <Card title={`Members (${view.members.length})`}>
              <ul className="flex flex-col gap-2 text-sm">
                {view.members.map((m) => (
                  <li key={m.user_email} className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
                    <div>
                      {m.user?.name ?? m.user_email} — {m.user_email}{" "}
                      {m.user?.department && <Badge>{m.user.department}</Badge>}
                    </div>
                    {m.individualGrants.length > 0 && (
                      <div className="mt-1 text-xs text-neutral-500">
                        Also has individual grants: {m.individualGrants.map((g) => g.tool_name).join(", ")}
                      </div>
                    )}
                  </li>
                ))}
                {view.members.length === 0 && <li className="text-neutral-500">No members.</li>}
              </ul>
            </Card>

            <Card title={`Tools granted to this project (${view.toolGrants.length})`}>
              <div className="flex flex-wrap gap-2">
                {view.toolGrants.map((g) => (
                  <Badge key={g.id} tone="blue">
                    {g.tool_name}
                  </Badge>
                ))}
                {view.toolGrants.length === 0 && <span className="text-sm text-neutral-500">No tools granted.</span>}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
