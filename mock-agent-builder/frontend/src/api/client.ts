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
};

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
}

export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ToolInputSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: ToolInputSchema;
}

export interface ContentBlock {
  type: string;
  text?: string;
}

export interface ToolCallResult {
  content: ContentBlock[];
  isError?: boolean;
}
