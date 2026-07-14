import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Db, UpstreamClient } from "@mcp-access/core";
import { recordAccessDecision, resolveEffectivePermission } from "@mcp-access/core";
import { getCurrentIdentity } from "./identityContext.js";

export interface GatewayServerDeps {
  db: Db;
  upstreamClient: UpstreamClient;
  enforceMode: "shadow" | "enforce";
}

/**
 * The MCP-protocol surface the agent builder platform talks to. Built fresh
 * per HTTP request (stateless StreamableHTTP pattern), so the identity
 * captured by the auth middleware for THIS request is exactly what these
 * handlers see via AsyncLocalStorage.
 */
export function createGatewayServer(deps: GatewayServerDeps): Server {
  const { db, upstreamClient, enforceMode } = deps;
  const server = new Server({ name: "mcp-access-gateway", version: "0.1.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const identity = getCurrentIdentity();
    const upstreamTools = await upstreamClient.listTools();

    const visibleTools = [];
    for (const tool of upstreamTools) {
      const result = await resolveEffectivePermission({ db }, identity, tool.name);
      recordAccessDecision(db, {
        userEmail: identity.email,
        toolName: tool.name,
        decision: result.allowed ? "allow" : "deny",
        reason: result.reason,
      });
      // In shadow mode every tool stays visible (decisions are only logged);
      // in enforce mode, denied tools are left out of the list entirely.
      if (result.allowed || enforceMode === "shadow") {
        visibleTools.push({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema ?? { type: "object" },
        });
      }
    }
    return { tools: visibleTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const identity = getCurrentIdentity();
    const { name, arguments: args } = request.params;

    const result = await resolveEffectivePermission({ db }, identity, name);
    recordAccessDecision(db, {
      userEmail: identity.email,
      toolName: name,
      decision: result.allowed ? "allow" : "deny",
      reason: result.reason,
    });

    if (!result.allowed && enforceMode === "enforce") {
      return {
        content: [{ type: "text", text: `Access denied: you do not have permission to use tool "${name}".` }],
        isError: true,
      };
    }

    try {
      return await upstreamClient.callToolRaw(name, (args as Record<string, unknown>) ?? {});
    } catch (error) {
      return {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  });

  return server;
}
