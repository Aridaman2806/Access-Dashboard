import { useEffect, useState } from "react";
import { api, type DashboardData } from "../api/client.js";
import { Badge, Card } from "../components/ui.js";

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <Card title="Upstream MCP server">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <div className="text-neutral-500">Status</div>
            <Badge tone={data.upstream.connected ? "green" : "red"}>
              {data.upstream.connected ? "Connected" : "Unreachable"}
            </Badge>
          </div>
          <div>
            <div className="text-neutral-500">Server</div>
            <div>
              {data.upstream.name} v{data.upstream.version}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Transport</div>
            <div>
              {data.upstream.transport} — {data.upstream.serverUrl}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Auth configured</div>
            <div>{data.upstream.authConfigured ? "Yes" : "No"}</div>
          </div>
        </div>
      </Card>

      <Card title={`Synced tools (${data.tools.length})`}>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="pb-2">Name</th>
              <th className="pb-2">Description</th>
              <th className="pb-2">Department tags</th>
              <th className="pb-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {data.tools.map((tool) => (
              <tr key={tool.name} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-2 font-mono">{tool.name}</td>
                <td className="py-2 text-neutral-600 dark:text-neutral-400">{tool.description}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {tool.departmentTags.length ? (
                      tool.departmentTags.map((tag) => <Badge key={tag}>{tag}</Badge>)
                    ) : (
                      <Badge tone="red">untagged — deny-by-default</Badge>
                    )}
                  </div>
                </td>
                <td className="py-2">{tool.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
