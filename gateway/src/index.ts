import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createUpstreamClient, migrate, openDb } from "@mcp-access/core";
import { env } from "./env.js";
import { createIdentityMiddleware } from "./auth.js";
import { createGatewayServer } from "./mcpServer.js";

const db = openDb(env.dbPath);
migrate(db);
const upstreamClient = createUpstreamClient(env.upstream);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "up", enforceMode: env.enforceMode });
});

app.post("/mcp", createIdentityMiddleware({ db, sharedSecret: env.sharedSecret }), async (req, res) => {
  const server = createGatewayServer({ db, upstreamClient, enforceMode: env.enforceMode });
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Gateway error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST for MCP requests." }, id: null });
});

app.listen(env.port, () => {
  console.log(`mcp-access-gateway listening on http://localhost:${env.port} (mode: ${env.enforceMode})`);
  console.log(`MCP endpoint: http://localhost:${env.port}/mcp`);
  console.log(`Upstream:     ${env.upstream.serverUrl} (${env.upstream.transport})`);
});
