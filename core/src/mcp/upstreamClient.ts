import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { UpstreamConfig } from "./upstreamConfig.js";

export interface UpstreamToolSummary {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
}

export interface UpstreamClient {
  getServerInfo(): Promise<{ name: string; version: string; connected: boolean }>;
  listTools(): Promise<UpstreamToolSummary[]>;
  /** Throws if the tool call errored — convenient for smoke-testing callers. */
  callTool(name: string, args?: Record<string, unknown>): Promise<unknown>;
  /**
   * Returns the raw CallToolResult as-is (isError may be true) without
   * throwing. The gateway uses this to faithfully relay a tool's own error
   * content to the caller, distinct from an access-denial response.
   */
  callToolRaw(name: string, args?: Record<string, unknown>): Promise<{ content: unknown[]; isError?: boolean }>;
  resetConnection(): void;
}

/**
 * Adapted from Health-Monitor/monitor-backend/src/mcpClient.ts. Unlike that
 * module, this is a factory (not a module-level singleton) so the gateway
 * and admin-api — separate processes, each with their own config — can each
 * own an independent connection without sharing hidden global state.
 *
 * Auth here is server-to-server (this service's own credential to the real
 * MCP server); per-user identity is never sent upstream, it's only used by
 * the caller (the gateway) for its own authorization decision.
 */
export function createUpstreamClient(config: UpstreamConfig): UpstreamClient {
  let clientPromise: Promise<Client> | null = null;

  function buildAuthHeaders(): Record<string, string> | undefined {
    const headers: Record<string, string> = { ...config.extraHeaders };
    if (config.bearerToken) headers["Authorization"] = `Bearer ${config.bearerToken}`;
    if (config.authHeaderName && config.authHeaderValue) headers[config.authHeaderName] = config.authHeaderValue;
    return Object.keys(headers).length > 0 ? headers : undefined;
  }

  function buildTransport(): Transport {
    if (config.transport === "stdio") {
      if (!config.stdioCommand) {
        throw new Error("MCP_TRANSPORT=stdio requires MCP_STDIO_COMMAND to be set");
      }
      return new StdioClientTransport({ command: config.stdioCommand, args: config.stdioArgs });
    }
    const headers = buildAuthHeaders();
    return new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      requestInit: headers ? { headers } : undefined,
    });
  }

  async function connect(): Promise<Client> {
    const client = new Client({ name: "mcp-access-gateway", version: "1.0.0" }, { capabilities: {} });
    await client.connect(buildTransport());
    return client;
  }

  async function getClient(): Promise<Client> {
    if (!clientPromise) {
      clientPromise = connect().catch((error) => {
        clientPromise = null;
        throw error;
      });
    }
    return clientPromise;
  }

  return {
    resetConnection() {
      clientPromise = null;
    },

    async getServerInfo() {
      try {
        const client = await getClient();
        const version = client.getServerVersion();
        return { name: version?.name ?? "unknown", version: version?.version ?? "unknown", connected: true };
      } catch {
        return { name: "unreachable", version: "unknown", connected: false };
      }
    },

    async listTools() {
      const client = await getClient();
      const { tools } = await client.listTools();
      return tools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    },

    async callTool(name: string, args: Record<string, unknown> = {}) {
      const client = await getClient();
      const result = await client.callTool({ name, arguments: args });
      if (result.isError) {
        const message =
          Array.isArray(result.content) && result.content[0]?.type === "text"
            ? (result.content[0] as { text: string }).text
            : "Tool returned an error";
        throw new Error(message);
      }
      return result;
    },

    async callToolRaw(name: string, args: Record<string, unknown> = {}) {
      const client = await getClient();
      const result = await client.callTool({ name, arguments: args });
      return result as { content: unknown[]; isError?: boolean };
    },
  };
}
