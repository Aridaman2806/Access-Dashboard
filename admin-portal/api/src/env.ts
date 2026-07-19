import "dotenv/config";
import { loadUpstreamConfigFromEnv } from "@mcp-access/core";

const isProduction = process.env.NODE_ENV === "production";
const PLACEHOLDER_SESSION_SECRETS = new Set(["", "change-me", "dev-only-insecure-secret"]);
const PLACEHOLDER_PASSWORDS = new Set(["", "change-me", "admin"]);

export const env = {
  isProduction,
  port: Number(process.env.PORT) || 4300,
  // Defaults to a repo-root-relative path (not "./data/...", which would
  // resolve to a different directory per package depending on cwd) so the
  // gateway and admin-api share the same db file out of the box.
  dbPath: process.env.DB_PATH || "../../data/gateway.sqlite",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  // Comma-separated list of origins allowed to make credentialed requests
  // to this API (the admin frontend's real URL(s)). Empty in non-production
  // falls back to a permissive dev default so local setup keeps working.
  adminFrontendOrigins: (process.env.ADMIN_FRONTEND_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  loginRateLimit: {
    windowMs: Number(process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60_000,
    max: Number(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX) || 20,
  },
  upstream: loadUpstreamConfigFromEnv(),
};

if (isProduction) {
  const problems: string[] = [];
  if (PLACEHOLDER_SESSION_SECRETS.has(env.sessionSecret)) problems.push("SESSION_SECRET");
  if (PLACEHOLDER_PASSWORDS.has(env.adminPassword)) problems.push("ADMIN_PASSWORD");
  if (env.adminFrontendOrigins.length === 0) problems.push("ADMIN_FRONTEND_ORIGIN");
  if (problems.length > 0) {
    // Fail fast rather than boot with a guessable session secret, a
    // default password, or (effectively) no CORS restriction in production.
    console.error(`Missing or placeholder required production config: ${problems.join(", ")}`);
    process.exit(1);
  }
}
