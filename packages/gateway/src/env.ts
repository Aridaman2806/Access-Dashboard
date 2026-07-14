import "dotenv/config";
import { loadUpstreamConfigFromEnv } from "@mcp-access/core";

export const env = {
  port: Number(process.env.PORT) || 4200,
  dbPath: process.env.DB_PATH || "./data/gateway.sqlite",
  sharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
  enforceMode: process.env.GATEWAY_ENFORCE_MODE === "enforce" ? ("enforce" as const) : ("shadow" as const),
  upstream: loadUpstreamConfigFromEnv(),
};

if (!env.sharedSecret) {
  console.warn(
    "GATEWAY_SHARED_SECRET is not set — every request will be rejected until it is configured (see .env.example).",
  );
}
