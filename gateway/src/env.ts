import "dotenv/config";
import { loadUpstreamConfigFromEnv } from "@mcp-access/core";

export const env = {
  port: Number(process.env.PORT) || 4200,
  // Defaults to a repo-root-relative path (not "./data/...", which would
  // resolve to a different directory per package depending on cwd) so the
  // gateway and admin-api share the same db file out of the box.
  dbPath: process.env.DB_PATH || "../data/gateway.sqlite",
  sharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
  enforceMode: process.env.GATEWAY_ENFORCE_MODE === "enforce" ? ("enforce" as const) : ("shadow" as const),
  upstream: loadUpstreamConfigFromEnv(),
};

if (!env.sharedSecret) {
  console.warn(
    "GATEWAY_SHARED_SECRET is not set — every request will be rejected until it is configured (see .env.example).",
  );
}
