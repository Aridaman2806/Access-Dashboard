import { useEffect, useState } from "react";
import { api, UNTAGGED_KEY, type Grant, type Tool, type ToolTagsResponse, type User } from "../api/client.js";
import { Badge, Button, Card, Input, MultiSelect, TagTiles, type TagTileItem } from "../components/ui.js";

export function UserAccess() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);

  const [allToolCount, setAllToolCount] = useState(0);
  const [tagsSummary, setTagsSummary] = useState<ToolTagsResponse | null>(null);
  const [grantTag, setGrantTag] = useState<string | null>(null);
  const [toolsForTag, setToolsForTag] = useState<Tool[]>([]);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    api.get<ToolTagsResponse>("/tools/tags").then(setTagsSummary);
    api.get<Tool[]>("/tools").then((all) => setAllToolCount(all.length));
    api.get<{ count: number }>("/users/count").then((r) => setUserCount(r.count));
  }, []);

  useEffect(() => {
    const query = grantTag ? `?tag=${encodeURIComponent(grantTag)}` : "";
    api.get<Tool[]>(`/tools${query}`).then(setToolsForTag);
  }, [grantTag]);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
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
    if (!newEmail || toolNames.length === 0) {
      setError("Email and at least one tool are required");
      return;
    }
    setGranting(true);
    try {
      await api.post("/grants/bulk", { userEmail: newEmail, userName: newName || undefined, toolNames });
      loadGrants(newEmail);
      setToolNames([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGranting(false);
    }
  }

  async function revoke(id: string) {
    await api.del(`/grants/${id}`);
    if (selected) loadGrants(selected.email);
  }

  const tiles: TagTileItem[] = tagsSummary?.tags.map((t) => ({ key: t.tag, label: t.tag, count: t.toolCount })) ?? [];
  if (tagsSummary && tagsSummary.untaggedCount > 0) {
    tiles.push({ key: UNTAGGED_KEY, label: "Untagged", count: tagsSummary.untaggedCount });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">User Access</h1>
        <p className="text-sm text-neutral-500">Search for a user to grant or revoke individual tool access.</p>
      </div>

      <Card title="Search users">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name…"
          className="mb-3 w-80"
        />
        {query.trim().length === 0 ? (
          <p className="text-sm text-neutral-500">
            {userCount === null ? "Loading…" : `${userCount} available user${userCount === 1 ? "" : "s"}`} — start
            typing above to search.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
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
            {results.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No matching users.</li>}
          </ul>
        )}
      </Card>

      <Card title="Grant / revoke individual tool access">
        <div className="mb-3 flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Browse tools by department tag, then pick which to grant</label>
          <TagTiles tiles={tiles} selected={grantTag} onSelect={setGrantTag} allLabel="All tools" allCount={allToolCount} />
        </div>

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
            <label className="text-xs text-neutral-500">
              Tools {grantTag && <span className="text-neutral-400">(under "{grantTag === "__untagged__" ? "Untagged" : grantTag}")</span>}
            </label>
            <MultiSelect options={toolsForTag.map((t) => t.name)} selected={toolNames} onChange={setToolNames} />
          </div>
          <Button onClick={() => void grant()} disabled={granting}>
            {granting ? "Granting…" : "Grant access"}
          </Button>
        </div>
        {toolNames.length > 0 && (
          <p className="mb-2 text-xs text-neutral-500">
            Selected across all tags so far: <span className="font-mono">{toolNames.join(", ")}</span>
          </p>
        )}
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
