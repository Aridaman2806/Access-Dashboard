import express from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createUpstreamClient, migrate, openDb, purgeAccessLogOlderThan } from "@mcp-access/core";
import { env } from "./env.js";
import { createIdentityMiddleware } from "./auth.js";
import { createGatewayServer } from "./mcpServer.js";

const db = openDb(env.dbPath);
migrate(db);
const upstreamClient = createUpstreamClient(env.upstream);

// tools/list records one allow/deny row per tool per request, so at org
// scale gateway_access_log grows unboundedly without a sweep. Run on
// startup and daily; unref'd so it never keeps the process alive.
function sweepAccessLog() {
  const removed = purgeAccessLogOlderThan(db, env.accessLogRetentionDays);
  if (removed > 0) {
    console.log(`Purged ${removed} gateway_access_log rows older than ${env.accessLogRetentionDays} days.`);
  }
}
sweepAccessLog();
setInterval(sweepAccessLog, 24 * 60 * 60 * 1000).unref();

const app = express();
// Behind a TLS-terminating reverse proxy, the rate limiter must key on the
// real client IP from X-Forwarded-For, not the proxy's own address —
// without this, express-rate-limit also flags the forwarded header as
// suspicious and every caller shares one bucket.
app.set("trust proxy", 1);
// No CORS middleware: the only caller of this endpoint is the agent builder
// platform's own backend (server-to-server), never a browser directly, so
// CORS — a browser-enforced mechanism — provides no real access control
// here. The shared secret is the actual trust boundary, checked below.
app.use(express.json());
// Never log the X-Gateway-Auth header value or any cookies.
app.use(morgan(env.isProduction ? "combined" : "dev", { skip: (req) => req.path === "/health" }));

const mcpRateLimit = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => {
  res.json({ status: "up", enforceMode: env.enforceMode });
});

app.post("/mcp", mcpRateLimit, createIdentityMiddleware({ db, sharedSecret: env.sharedSecret }), async (req, res) => {
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
