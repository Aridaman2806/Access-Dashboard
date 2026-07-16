import { useEffect, useState } from "react";
import { api, type Grant, type Project, type Tool } from "../api/client.js";
import { Badge, Button, Card, Input, MultiSelect } from "../components/ui.js";

interface ProjectAccessView {
  project: Project;
  members: { user_email: string; user?: { name: string; department: string | null } }[];
  toolGrants: Grant[];
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectAccessView | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [bulkTools, setBulkTools] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadProjects() {
    api.get<Project[]>("/projects").then(setProjects);
  }

  function loadDetail(code: string) {
    api.get<ProjectAccessView>(`/projects/${encodeURIComponent(code)}/access`).then(setDetail);
  }

  useEffect(() => {
    loadProjects();
    api.get<Tool[]>("/tools").then(setTools);
  }, []);

  useEffect(() => {
    if (selectedCode) loadDetail(selectedCode);
  }, [selectedCode]);

  async function createProject() {
    setError(null);
    try {
      await api.post("/projects", { code: newCode, name: newName });
      setNewCode("");
      setNewName("");
      loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addMember() {
    if (!selectedCode) return;
    setError(null);
    try {
      await api.post(`/projects/${encodeURIComponent(selectedCode)}/members`, {
        userEmail: memberEmail,
        userName: memberName || undefined,
      });
      setMemberEmail("");
      setMemberName("");
      loadDetail(selectedCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeMember(email: string) {
    if (!selectedCode) return;
    await api.del(`/projects/${encodeURIComponent(selectedCode)}/members/${encodeURIComponent(email)}`);
    loadDetail(selectedCode);
  }

  async function bulkGrant() {
    if (!selectedCode || bulkTools.length === 0) return;
    await api.post(`/projects/${encodeURIComponent(selectedCode)}/grants/bulk`, { toolNames: bulkTools });
    setBulkTools([]);
    loadDetail(selectedCode);
  }

  async function revokeGrant(id: string) {
    if (!selectedCode) return;
    await api.del(`/projects/${encodeURIComponent(selectedCode)}/grants/${id}`);
    loadDetail(selectedCode);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-neutral-500">Group users by project code and grant tools to everyone in the group at once.</p>
      </div>

      <Card title="Create a project">
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Project code</label>
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="PROJ-1234" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Name</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Checkout Revamp" />
          </div>
          <Button onClick={() => void createProject()}>Create</Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <div className="flex gap-4">
        <Card title="All projects">
          <ul className="flex min-w-48 flex-col gap-1">
            {projects.map((p) => (
              <li key={p.code}>
                <button
                  onClick={() => setSelectedCode(p.code)}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    selectedCode === p.code ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-neutral-500">{p.code}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {detail && (
          <div className="flex flex-1 flex-col gap-4">
            <Card title={`Members of ${detail.project.name} (${detail.project.code})`}>
              <ul className="mb-3 flex flex-col gap-1">
                {detail.members.map((m) => (
                  <li key={m.user_email} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                    <span>
                      {m.user?.name ?? m.user_email} — {m.user_email}{" "}
                      {m.user?.department && <Badge>{m.user.department}</Badge>}
                    </span>
                    <Button variant="danger" onClick={() => void removeMember(m.user_email)}>
                      Remove
                    </Button>
                  </li>
                ))}
                {detail.members.length === 0 && <li className="text-sm text-neutral-500">No members yet.</li>}
              </ul>
              <div className="flex items-end gap-2">
                <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="user@company.com" />
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Name (if new)" />
                <Button variant="secondary" onClick={() => void addMember()}>
                  Add member
                </Button>
              </div>
            </Card>

            <Card title="Tools granted to this project">
              <ul className="mb-3 flex flex-col gap-1">
                {detail.toolGrants.map((g) => (
                  <li key={g.id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                    <span className="font-mono">{g.tool_name}</span>
                    <Button variant="danger" onClick={() => void revokeGrant(g.id)}>
                      Revoke
                    </Button>
                  </li>
                ))}
                {detail.toolGrants.length === 0 && <li className="text-sm text-neutral-500">No tools granted yet.</li>}
              </ul>
              <div className="flex items-end gap-2">
                <MultiSelect options={tools.map((t) => t.name)} selected={bulkTools} onChange={setBulkTools} />
                <Button variant="secondary" onClick={() => void bulkGrant()} disabled={bulkTools.length === 0}>
                  Grant selected tools to all members
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
