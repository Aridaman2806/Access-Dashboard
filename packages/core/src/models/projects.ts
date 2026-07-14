import type { Db } from "../db/client.js";
import { all, get, run } from "../db/client.js";
import type { Project } from "../types.js";

export function createProject(db: Db, params: { code: string; name: string }): Project {
  const now = new Date().toISOString();
  run(db, `INSERT INTO projects (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)`, [
    params.code,
    params.name,
    now,
    now,
  ]);
  return get<Project>(db, `SELECT * FROM projects WHERE code = ?`, [params.code])!;
}

export function getProject(db: Db, code: string): Project | undefined {
  return get<Project>(db, `SELECT * FROM projects WHERE code = ?`, [code]);
}

export function listProjects(db: Db): Project[] {
  return all<Project>(db, `SELECT * FROM projects ORDER BY name`);
}

export function searchProjects(db: Db, query = ""): Project[] {
  const like = `%${query}%`;
  return all<Project>(db, `SELECT * FROM projects WHERE code LIKE ? OR name LIKE ? ORDER BY name LIMIT 50`, [
    like,
    like,
  ]);
}
