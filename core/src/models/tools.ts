import type { Db } from "../db/client.js";
import { all, get, run, transaction } from "../db/client.js";
import type { Tool } from "../types.js";

export function upsertTool(db: Db, tool: { name: string; description?: string | null }): Tool {
  const now = new Date().toISOString();
  run(
    db,
    `INSERT INTO tools (name, description, is_active, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description = excluded.description,
       updated_at = excluded.updated_at`,
    [tool.name, tool.description ?? null, now, now],
  );
  return get<Tool>(db, `SELECT * FROM tools WHERE name = ?`, [tool.name])!;
}

export function setToolActive(db: Db, name: string, isActive: boolean): void {
  run(db, `UPDATE tools SET is_active = ?, updated_at = ? WHERE name = ?`, [
    isActive ? 1 : 0,
    new Date().toISOString(),
    name,
  ]);
}

export function getTool(db: Db, name: string): Tool | undefined {
  return get<Tool>(db, `SELECT * FROM tools WHERE name = ?`, [name]);
}

export function listTools(db: Db): Tool[] {
  return all<Tool>(db, `SELECT * FROM tools ORDER BY name`);
}

export function searchTools(db: Db, query = ""): Tool[] {
  const like = `%${query}%`;
  return all<Tool>(db, `SELECT * FROM tools WHERE name LIKE ? OR description LIKE ? ORDER BY name LIMIT 50`, [
    like,
    like,
  ]);
}

export function getToolDepartmentTags(db: Db, toolName: string): string[] {
  return all<{ department_tag: string }>(
    db,
    `SELECT department_tag FROM tool_department_tags WHERE tool_name = ? ORDER BY department_tag`,
    [toolName],
  ).map((r) => r.department_tag);
}

/** Replaces the full set of department tags for a tool with exactly `tags`. */
export function setToolDepartmentTags(db: Db, toolName: string, tags: string[]): void {
  transaction(db, () => {
    run(db, `DELETE FROM tool_department_tags WHERE tool_name = ?`, [toolName]);
    for (const tag of new Set(tags.map((t) => t.trim()).filter(Boolean))) {
      run(db, `INSERT INTO tool_department_tags (tool_name, department_tag) VALUES (?, ?)`, [toolName, tag]);
    }
  });
}

/** Every distinct department tag currently in use, with how many tools carry it. */
export function listDistinctDepartmentTags(db: Db): { tag: string; toolCount: number }[] {
  return all<{ tag: string; toolCount: number }>(
    db,
    `SELECT department_tag AS tag, COUNT(DISTINCT tool_name) AS toolCount
     FROM tool_department_tags
     GROUP BY department_tag
     ORDER BY department_tag`,
  );
}

export function getToolsByDepartmentTag(db: Db, tag: string): Tool[] {
  return all<Tool>(
    db,
    `SELECT tools.* FROM tools
     JOIN tool_department_tags ON tool_department_tags.tool_name = tools.name
     WHERE tool_department_tags.department_tag = ?
     ORDER BY tools.name`,
    [tag],
  );
}

export function getUntaggedTools(db: Db): Tool[] {
  return all<Tool>(
    db,
    `SELECT * FROM tools WHERE name NOT IN (SELECT tool_name FROM tool_department_tags) ORDER BY name`,
  );
}
