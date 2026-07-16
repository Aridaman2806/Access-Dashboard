import { useEffect, useState } from "react";
import { api, type AuditLogEntry } from "../api/client.js";
import { Card } from "../components/ui.js";

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    api.get<AuditLogEntry[]>("/audit-log?limit=200").then(setEntries);
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-neutral-500">Every grant, revoke, and tagging action taken in this portal.</p>
      </div>
      <Card>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="pb-2">When</th>
              <th className="pb-2">Actor</th>
              <th className="pb-2">Action</th>
              <th className="pb-2">Target</th>
              <th className="pb-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100 align-top dark:border-neutral-800">
                <td className="py-2 whitespace-nowrap text-neutral-500">{new Date(e.created_at).toLocaleString()}</td>
                <td className="py-2">{e.actor_email}</td>
                <td className="py-2 font-mono">{e.action}</td>
                <td className="py-2 font-mono">
                  {e.target_type}:{e.target_id}
                </td>
                <td className="max-w-sm py-2 break-all text-neutral-500">{e.details}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
