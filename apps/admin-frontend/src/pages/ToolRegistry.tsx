import { useEffect, useState } from "react";
import { api, type Tool } from "../api/client.js";
import { Badge, Button, Card, Input } from "../components/ui.js";

function TagEditor({ tool, onSaved }: { tool: Tool; onSaved: (tool: Tool) => void }) {
  const [value, setValue] = useState(tool.departmentTags.join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const tags = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await api.put<Tool>(`/tools/${encodeURIComponent(tool.name)}/tags`, { tags });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="engineering, finance" className="w-56" />
      <Button variant="secondary" onClick={() => void save()} disabled={saving}>
        Save
      </Button>
    </div>
  );
}

export function ToolRegistry() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<Tool[]>("/tools")
      .then(setTools)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function sync() {
    setSyncing(true);
    try {
      await api.post<Tool[]>("/tools/sync");
      load();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tool Registry</h1>
        <Button onClick={() => void sync()} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync from upstream"}
        </Button>
      </div>

      <Card>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Department tags</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name} className="border-t border-neutral-100 align-top dark:border-neutral-800">
                  <td className="py-3 font-mono">{tool.name}</td>
                  <td className="max-w-xs py-3 text-neutral-600 dark:text-neutral-400">{tool.description}</td>
                  <td className="py-3">
                    <div className="mb-1 flex flex-wrap gap-1">
                      {tool.departmentTags.length ? (
                        tool.departmentTags.map((tag) => <Badge key={tag}>{tag}</Badge>)
                      ) : (
                        <Badge tone="red">untagged</Badge>
                      )}
                    </div>
                    <TagEditor
                      tool={tool}
                      onSaved={(updated) => setTools((prev) => prev.map((t) => (t.name === updated.name ? updated : t)))}
                    />
                  </td>
                </tr>
              ))}
              {tools.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-neutral-500">
                    No tools yet — click "Sync from upstream" to pull the tool list from the real MCP server.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
