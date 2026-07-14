import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "./env.js";

export interface CallerIdentity {
  email: string;
  name: string;
}

/**
 * Unlike core's createUpstreamClient (a process-lifetime singleton
 * connection, correct for the gateway/admin-portal-api which each have one
 * fixed server identity), every request here can be a different logged-in demo
 * user, and the MCP SDK bakes headers in at transport-construction time. So
 * this opens a fresh client+transport per call rather than caching one.
 * X-User-Department is deliberately never sent -- this demo's access comes
 * entirely from project-code grants, not department tags.
 */
async function connectAsCaller(identity: CallerIdentity): Promise<Client> {
  const client = new Client({ name: "mock-agent-builder", version: "0.1.0" }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(env.gatewayUrl), {
    requestInit: {
      headers: {
        "X-Gateway-Auth": env.gatewaySharedSecret,
        "X-User-Email": identity.email,
        "X-User-Name": identity.name,
      },
    },
  });
  await client.connect(transport);
  return client;
}

export async function listAllowedTools(identity: CallerIdentity) {
  const client = await connectAsCaller(identity);
  try {
    const { tools } = await client.listTools();
    return tools;
  } finally {
    await client.close();
  }
}

export async function callAllowedTool(identity: CallerIdentity, name: string, args: Record<string, unknown>) {
  const client = await connectAsCaller(identity);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
  }
}
