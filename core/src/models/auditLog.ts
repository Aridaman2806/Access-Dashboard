import crypto from "node:crypto";
import type { Db } from "../db/client.js";
import { all, run } from "../db/client.js";
import type { AuditLogEntry } from "../types.js";

export function recordAudit(
  db: Db,
  params: { actorEmail: string; action: string; targetType: string; targetId: string; details?: unknown },
): void {
  run(
    db,
    `INSERT INTO audit_log (id, actor_email, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      params.actorEmail,
      params.action,
      params.targetType,
      params.targetId,
      params.details !== undefined ? JSON.stringify(params.details) : null,
      new Date().toISOString(),
    ],
  );
}

export function listAuditLog(db: Db, params: { limit?: number; offset?: number } = {}): AuditLogEntry[] {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  return all<AuditLogEntry>(db, `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`, [
    limit,
    offset,
  ]);
}
