import "dotenv/config";
import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

const PORT = Number(process.env.PORT) || 4000;
const startedAt = Date.now();

const app = express();
app.use(cors());
app.use(express.json());

// Stateless MCP endpoint: a fresh server + transport per request, per the
// SDK's recommended pattern for stateless StreamableHTTP servers.
app.post("/mcp", async (req, res) => {
  const server = createServer();
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Use POST for MCP requests." }, id: null });
});

app.get("/health", (_req, res) => {
  res.json({
    server: SERVER_NAME,
    version: SERVER_VERSION,
    status: "up",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  });
});

app.listen(PORT, () => {
  console.log(`${SERVER_NAME} listening on http://localhost:${PORT}`);
  console.log(`MCP endpoint:    http://localhost:${PORT}/mcp`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
});
