import type { Db } from "../db/client.js";
import { all, run } from "../db/client.js";
import type { ProjectMember } from "../types.js";

export function addProjectMember(
  db: Db,
  params: { projectCode: string; userEmail: string; addedBy: string },
): void {
  run(
    db,
    `INSERT INTO project_members (project_code, user_email, added_by, added_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(project_code, user_email) DO NOTHING`,
    [params.projectCode, params.userEmail, params.addedBy, new Date().toISOString()],
  );
}

export function removeProjectMember(db: Db, projectCode: string, userEmail: string): void {
  run(db, `DELETE FROM project_members WHERE project_code = ? AND user_email = ?`, [projectCode, userEmail]);
}

export function listMembersForProject(db: Db, projectCode: string): ProjectMember[] {
  return all<ProjectMember>(db, `SELECT * FROM project_members WHERE project_code = ? ORDER BY user_email`, [
    projectCode,
  ]);
}

export function listProjectCodesForUser(db: Db, userEmail: string): string[] {
  return all<{ project_code: string }>(
    db,
    `SELECT project_code FROM project_members WHERE user_email = ?`,
    [userEmail],
  ).map((r) => r.project_code);
}
