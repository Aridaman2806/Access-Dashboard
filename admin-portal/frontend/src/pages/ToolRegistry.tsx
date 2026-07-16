import { useEffect, useState } from "react";
import { api, UNTAGGED_KEY, type Tool, type ToolTagsResponse } from "../api/client.js";
import { Badge, Button, Card, Input, TagTiles, type TagTileItem } from "../components/ui.js";

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
  const [totalCount, setTotalCount] = useState(0);
  const [tagsSummary, setTagsSummary] = useState<ToolTagsResponse | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function loadTags() {
    api.get<ToolTagsResponse>("/tools/tags").then(setTagsSummary);
  }

  function loadTools() {
    setLoading(true);
    const query = selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : "";
    api
      .get<Tool[]>(`/tools${query}`)
      .then(setTools)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTags();
    api.get<Tool[]>("/tools").then((all) => setTotalCount(all.length));
  }, []);

  useEffect(loadTools, [selectedTag]);

  async function sync() {
    setSyncing(true);
    try {
      await api.post<Tool[]>("/tools/sync");
      loadTags();
      loadTools();
      api.get<Tool[]>("/tools").then((all) => setTotalCount(all.length));
    } finally {
      setSyncing(false);
    }
  }

  function handleTagSaved(updated: Tool) {
    setTools((prev) => prev.map((t) => (t.name === updated.name ? updated : t)));
    loadTags();
  }

  const tiles: TagTileItem[] =
    tagsSummary?.tags.map((t) => ({ key: t.tag, label: t.tag, count: t.toolCount })) ?? [];
  if (tagsSummary && tagsSummary.untaggedCount > 0) {
    tiles.push({ key: UNTAGGED_KEY, label: "Untagged", count: tagsSummary.untaggedCount });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tool Registry</h1>
          <p className="text-sm text-neutral-500">Tag tools with the departments allowed to use them by default.</p>
        </div>
        <Button onClick={() => void sync()} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync from upstream"}
        </Button>
      </div>

      <Card title="Browse by tag">
        <TagTiles tiles={tiles} selected={selectedTag} onSelect={setSelectedTag} allLabel="All tools" allCount={totalCount} />
      </Card>

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
                    <TagEditor tool={tool} onSaved={handleTagSaved} />
                  </td>
                </tr>
              ))}
              {tools.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-neutral-500">
                    {selectedTag
                      ? "No tools under this tag."
                      : 'No tools yet — click "Sync from upstream" to pull the tool list from the real MCP server.'}
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
