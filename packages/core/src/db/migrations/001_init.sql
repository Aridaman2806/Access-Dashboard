CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tools (
  name TEXT PRIMARY KEY,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_department_tags (
  tool_name TEXT NOT NULL REFERENCES tools(name) ON DELETE CASCADE,
  department_tag TEXT NOT NULL,
  PRIMARY KEY (tool_name, department_tag)
);

CREATE TABLE IF NOT EXISTS individual_grants (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  tool_name TEXT NOT NULL REFERENCES tools(name) ON DELETE CASCADE,
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_individual_grants_lookup
  ON individual_grants (user_email, tool_name, revoked_at);

CREATE TABLE IF NOT EXISTS projects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
  project_code TEXT NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at TEXT NOT NULL,
  PRIMARY KEY (project_code, user_email)
);

CREATE INDEX IF NOT EXISTS idx_project_members_by_user ON project_members (user_email);

CREATE TABLE IF NOT EXISTS project_grants (
  id TEXT PRIMARY KEY,
  project_code TEXT NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  tool_name TEXT NOT NULL REFERENCES tools(name) ON DELETE CASCADE,
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_grants_lookup
  ON project_grants (project_code, tool_name, revoked_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gateway_access_log (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gateway_access_log_created_at ON gateway_access_log (created_at);
