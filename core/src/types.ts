export interface User {
  email: string;
  name: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface IndividualGrant {
  id: string;
  user_email: string;
  tool_name: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface Project {
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_code: string;
  user_email: string;
  added_by: string;
  added_at: string;
}

export interface ProjectGrant {
  id: string;
  project_code: string;
  tool_name: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string | null;
  created_at: string;
}

export interface GatewayAccessLogEntry {
  id: string;
  user_email: string;
  tool_name: string;
  decision: "allow" | "deny";
  reason: PermissionReason;
  created_at: string;
}

export type PermissionReason = "department" | "individual" | "project" | "none";

export interface PermissionResult {
  allowed: boolean;
  reason: PermissionReason;
  matchedProjectCode?: string;
}

export interface RequestIdentity {
  email: string;
  name: string;
  department: string | null;
}
