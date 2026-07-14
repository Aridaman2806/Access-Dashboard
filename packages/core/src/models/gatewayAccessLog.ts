import crypto from "node:crypto";
import type { Db } from "../db/client.js";
import { all, run } from "../db/client.js";
import type { GatewayAccessLogEntry, PermissionReason } from "../types.js";

export function recordAccessDecision(
  db: Db,
  params: { userEmail: string; toolName: string; decision: "allow" | "deny"; reason: PermissionReason },
): void {
  run(
    db,
    `INSERT INTO gateway_access_log (id, user_email, tool_name, decision, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), params.userEmail, params.toolName, params.decision, params.reason, new Date().toISOString()],
  );
}

export function listAccessLog(db: Db, params: { limit?: number; offset?: number } = {}): GatewayAccessLogEntry[] {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  return all<GatewayAccessLogEntry>(
    db,
    `SELECT * FROM gateway_access_log ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}
