import { Store } from "express-session";
import type { SessionData } from "express-session";
import { all, get, run, type Db } from "@mcp-access/core";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // sessions without an explicit cookie maxAge live 24h

/**
 * express-session Store backed by the already-shared SQLite db (the
 * admin_sessions table from core's migrations). Replaces the default
 * MemoryStore, which leaks memory over long uptimes and logs every admin
 * out on each restart/redeploy. Deliberately hand-rolled on node:sqlite
 * instead of pulling in connect-sqlite3, which would drag a native sqlite3
 * dependency into a repo that's otherwise node:sqlite-only.
 */
export class SqliteSessionStore extends Store {
  private readonly db: Db;
  private readonly sweeper: NodeJS.Timeout;

  constructor(db: Db) {
    super();
    this.db = db;
    this.purgeExpired();
    this.sweeper = setInterval(() => this.purgeExpired(), 60 * 60 * 1000);
    // Never keep the process alive just for session cleanup.
    this.sweeper.unref();
  }

  private purgeExpired(): void {
    run(this.db, `DELETE FROM admin_sessions WHERE expires_at < ?`, [new Date().toISOString()]);
  }

  private expiryFor(session: SessionData): string {
    const maxAge = session.cookie?.maxAge;
    const ttl = typeof maxAge === "number" && maxAge > 0 ? maxAge : DEFAULT_TTL_MS;
    return new Date(Date.now() + ttl).toISOString();
  }

  override get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    try {
      const row = get<{ data: string; expires_at: string }>(
        this.db,
        `SELECT data, expires_at FROM admin_sessions WHERE sid = ?`,
        [sid],
      );
      if (!row || row.expires_at < new Date().toISOString()) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.data) as SessionData);
    } catch (err) {
      callback(err);
    }
  }

  override set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    try {
      run(
        this.db,
        `INSERT INTO admin_sessions (sid, data, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
        [sid, JSON.stringify(session), this.expiryFor(session)],
      );
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      run(this.db, `DELETE FROM admin_sessions WHERE sid = ?`, [sid]);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  override touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    try {
      run(this.db, `UPDATE admin_sessions SET expires_at = ? WHERE sid = ?`, [this.expiryFor(session), sid]);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  override all(callback: (err: unknown, sessions?: SessionData[]) => void): void {
    try {
      const rows = all<{ data: string }>(this.db, `SELECT data FROM admin_sessions WHERE expires_at >= ?`, [
        new Date().toISOString(),
      ]);
      callback(null, rows.map((r) => JSON.parse(r.data) as SessionData));
    } catch (err) {
      callback(err);
    }
  }

  override length(callback: (err: unknown, length?: number) => void): void {
    try {
      const row = get<{ count: number }>(this.db, `SELECT COUNT(*) AS count FROM admin_sessions WHERE expires_at >= ?`, [
        new Date().toISOString(),
      ]);
      callback(null, row?.count ?? 0);
    } catch (err) {
      callback(err);
    }
  }

  override clear(callback?: (err?: unknown) => void): void {
    try {
      run(this.db, `DELETE FROM admin_sessions`);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}
