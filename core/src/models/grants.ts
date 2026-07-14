import crypto from "node:crypto";
import type { Db } from "../db/client.js";
import { all, get, run } from "../db/client.js";
import type { IndividualGrant } from "../types.js";

export function grantToolToUser(
  db: Db,
  params: { userEmail: string; toolName: string; grantedBy: string },
): IndividualGrant {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  run(
    db,
    `INSERT INTO individual_grants (id, user_email, tool_name, granted_by, granted_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, params.userEmail, params.toolName, params.grantedBy, now],
  );
  return get<IndividualGrant>(db, `SELECT * FROM individual_grants WHERE id = ?`, [id])!;
}

export function revokeIndividualGrant(db: Db, id: string, revokedBy: string): void {
  run(db, `UPDATE individual_grants SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL`, [
    new Date().toISOString(),
    revokedBy,
    id,
  ]);
}

export function hasActiveIndividualGrant(db: Db, userEmail: string, toolName: string): boolean {
  const row = get(
    db,
    `SELECT 1 FROM individual_grants WHERE user_email = ? AND tool_name = ? AND revoked_at IS NULL LIMIT 1`,
    [userEmail, toolName],
  );
  return row !== undefined;
}

export function listActiveIndividualGrantsForUser(db: Db, userEmail: string): IndividualGrant[] {
  return all<IndividualGrant>(
    db,
    `SELECT * FROM individual_grants WHERE user_email = ? AND revoked_at IS NULL ORDER BY granted_at DESC`,
    [userEmail],
  );
}

export function listActiveIndividualGrantsForTool(db: Db, toolName: string): IndividualGrant[] {
  return all<IndividualGrant>(
    db,
    `SELECT * FROM individual_grants WHERE tool_name = ? AND revoked_at IS NULL ORDER BY granted_at DESC`,
    [toolName],
  );
}
