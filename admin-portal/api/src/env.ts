import "dotenv/config";
import { loadUpstreamConfigFromEnv } from "@mcp-access/core";

export const env = {
  port: Number(process.env.PORT) || 4300,
  // Defaults to a repo-root-relative path (not "./data/...", which would
  // resolve to a different directory per package depending on cwd) so the
  // gateway and admin-api share the same db file out of the box.
  dbPath: process.env.DB_PATH || "../../data/gateway.sqlite",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  upstream: loadUpstreamConfigFromEnv(),
};
