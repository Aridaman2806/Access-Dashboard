import "dotenv/config";
import { loadUpstreamConfigFromEnv } from "@mcp-access/core";

export const env = {
  port: Number(process.env.PORT) || 4300,
  dbPath: process.env.DB_PATH || "./data/gateway.sqlite",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  upstream: loadUpstreamConfigFromEnv(),
};
