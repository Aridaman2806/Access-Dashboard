import crypto from "node:crypto";
import type { Db } from "../db/client.js";
import { all, get, run } from "../db/client.js";
import type { ProjectGrant } from "../types.js";

export function grantToolToProject(
  db: Db,
  params: { projectCode: string; toolName: string; grantedBy: string },
): ProjectGrant {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  run(
    db,
    `INSERT INTO project_grants (id, project_code, tool_name, granted_by, granted_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, params.projectCode, params.toolName, params.grantedBy, now],
  );
  return get<ProjectGrant>(db, `SELECT * FROM project_grants WHERE id = ?`, [id])!;
}

export function revokeProjectGrant(db: Db, id: string, revokedBy: string): void {
  run(db, `UPDATE project_grants SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL`, [
    new Date().toISOString(),
    revokedBy,
    id,
  ]);
}

export function hasActiveProjectGrant(db: Db, projectCode: string, toolName: string): boolean {
  const row = get(
    db,
    `SELECT 1 FROM project_grants WHERE project_code = ? AND tool_name = ? AND revoked_at IS NULL LIMIT 1`,
    [projectCode, toolName],
  );
  return row !== undefined;
}

export function listActiveProjectGrantsForProject(db: Db, projectCode: string): ProjectGrant[] {
  return all<ProjectGrant>(
    db,
    `SELECT * FROM project_grants WHERE project_code = ? AND revoked_at IS NULL ORDER BY granted_at DESC`,
    [projectCode],
  );
}

export function listActiveProjectGrantsForTool(db: Db, toolName: string): ProjectGrant[] {
  return all<ProjectGrant>(
    db,
    `SELECT * FROM project_grants WHERE tool_name = ? AND revoked_at IS NULL ORDER BY granted_at DESC`,
    [toolName],
  );
}
