import { useEffect, useState } from "react";
import { api, ApiError, type Tool, type ToolCallResult } from "../api/client.js";
import { Badge, Button, Card, Input, Textarea } from "../components/ui.js";

function isSimpleSchema(tool: Tool): boolean {
  const props = tool.inputSchema?.properties;
  if (!props || typeof props !== "object") return false;
  return Object.values(props).every((p) => ["string", "number", "boolean", undefined].includes(p.type));
}

export function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tool | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [rawJson, setRawJson] = useState("{}");
  const [result, setResult] = useState<ToolCallResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  function load() {
    setLoading(true);
    setLoadError(null);
    api
      .get<Tool[]>("/tools")
      .then(setTools)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function selectTool(tool: Tool) {
    setSelected(tool);
    setResult(null);
    setCallError(null);
    const props = tool.inputSchema?.properties ?? {};
    setFormValues(Object.fromEntries(Object.keys(props).map((k) => [k, ""])));
    setRawJson("{}");
  }

  async function runTool() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    setCallError(null);
    try {
      const args = isSimpleSchema(selected) ? formValues : JSON.parse(rawJson);
      const res = await api.post<ToolCallResult>(`/tools/${encodeURIComponent(selected.name)}/call`, { arguments: args });
      setResult(res);
    } catch (e) {
      setCallError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tools you can use</h2>
          <p className="text-sm text-neutral-500">
            This list comes straight from the gateway — it's already filtered to only what you have access to.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {loadError && (
        <Card>
          <p className="text-red-600">{loadError}</p>
        </Card>
      )}

      <div className="flex gap-4">
        <Card title={`Allowed tools (${tools.length})`}>
          <ul className="flex min-w-56 flex-col gap-1">
            {tools.map((tool) => (
              <li key={tool.name}>
                <button
                  onClick={() => selectTool(tool)}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    selected?.name === tool.name ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  <div className="font-mono">{tool.name}</div>
                  <div className="text-xs text-neutral-500">{tool.description}</div>
                </button>
              </li>
            ))}
            {tools.length === 0 && !loading && (
              <li className="text-sm text-neutral-500">
                No tools available yet — ask an admin to grant your project code (or you individually) access to a
                tool, then hit Refresh.
              </li>
            )}
          </ul>
        </Card>

        {selected && (
          <Card title={`Run ${selected.name}`}>
            <div className="mb-3 flex flex-col gap-2">
              {isSimpleSchema(selected) ? (
                Object.keys(selected.inputSchema?.properties ?? {}).map((key) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">{key}</label>
                    <Input
                      value={formValues[key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-500">Arguments (JSON)</label>
                  <Textarea value={rawJson} onChange={(e) => setRawJson(e.target.value)} rows={4} className="w-72" />
                </div>
              )}
              <Button onClick={() => void runTool()} disabled={running}>
                {running ? "Running…" : "Run tool"}
              </Button>
            </div>

            {callError && <p className="text-sm text-red-600">{callError}</p>}

            {result && (
              <div>
                {result.isError && <Badge tone="red">Access denied / tool error</Badge>}
                <pre className="mt-2 max-w-md overflow-x-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
                  {result.content.map((c) => c.text ?? JSON.stringify(c)).join("\n")}
                </pre>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
