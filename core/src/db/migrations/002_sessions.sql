-- Admin-portal session persistence. Replaces express-session's default
-- MemoryStore, which leaks memory over long uptimes and drops every session
-- (logging all admins out) on each restart/redeploy.
CREATE TABLE IF NOT EXISTS admin_sessions (
  sid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);
