import type { Db } from "../db/client.js";
import { all, get, run } from "../db/client.js";
import type { User } from "../types.js";

export function upsertUser(db: Db, user: { email: string; name: string; department?: string | null }): User {
  const now = new Date().toISOString();
  run(
    db,
    `INSERT INTO users (email, name, department, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       department = excluded.department,
       updated_at = excluded.updated_at`,
    [user.email, user.name, user.department ?? null, now, now],
  );
  return get<User>(db, `SELECT * FROM users WHERE email = ?`, [user.email])!;
}

export function getUserByEmail(db: Db, email: string): User | undefined {
  return get<User>(db, `SELECT * FROM users WHERE email = ?`, [email]);
}

export function searchUsers(db: Db, query = ""): User[] {
  const like = `%${query}%`;
  return all<User>(db, `SELECT * FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY name LIMIT 50`, [like, like]);
}

export function listUsers(db: Db): User[] {
  return all<User>(db, `SELECT * FROM users ORDER BY name`);
}

export function countUsers(db: Db): number {
  return get<{ count: number }>(db, `SELECT COUNT(*) AS count FROM users`)!.count;
}

/**
 * Case/whitespace-insensitive on purpose: department strings arrive from a
 * live SSO directory sync (casing outside our control) but are compared
 * against admin-typed tags, so normalize both sides at query time.
 */
export function findUsersByDepartments(db: Db, departments: string[]): User[] {
  if (departments.length === 0) return [];
  const placeholders = departments.map(() => "LOWER(TRIM(?))").join(",");
  return all<User>(
    db,
    `SELECT * FROM users WHERE LOWER(TRIM(department)) IN (${placeholders}) ORDER BY name`,
    departments,
  );
}
