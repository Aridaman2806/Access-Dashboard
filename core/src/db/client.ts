import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type Db = DatabaseSync;

/** Opens (creating parent dirs as needed) a SQLite db file, or ":memory:" for tests. */
export function openDb(filePath: string): Db {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  // WAL mode so the gateway and admin-api processes can share one db file
  // with concurrent readers and a writer without lock-contention errors.
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export function run(db: Db, sql: string, params: unknown[] = []) {
  return db.prepare(sql).run(...(params as never[]));
}

export function get<T = unknown>(db: Db, sql: string, params: unknown[] = []): T | undefined {
  return db.prepare(sql).get(...(params as never[])) as T | undefined;
}

export function all<T = unknown>(db: Db, sql: string, params: unknown[] = []): T[] {
  return db.prepare(sql).all(...(params as never[])) as T[];
}

export function transaction<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
