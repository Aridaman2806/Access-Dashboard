const BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export interface Tool {
  name: string;
  description: string | null;
  is_active: number;
  departmentTags: string[];
}

export interface User {
  email: string;
  name: string;
  department: string | null;
}

export interface Project {
  code: string;
  name: string;
}

export interface Grant {
  id: string;
  user_email?: string;
  project_code?: string;
  tool_name: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
}

export interface PermissionResult {
  tool: string;
  allowed: boolean;
  reason: "department" | "individual" | "project" | "none";
  matchedProjectCode?: string;
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

export interface DashboardData {
  upstream: {
    name: string;
    version: string;
    connected: boolean;
    transport: string;
    serverUrl: string;
    authConfigured: boolean;
  };
  tools: Tool[];
}
