import "dotenv/config";
import { loadUpstreamConfigFromEnv } from "@mcp-access/core";

const isProduction = process.env.NODE_ENV === "production";
const PLACEHOLDER_SECRETS = new Set(["change-me", ""]);

const rawEnforceMode = process.env.GATEWAY_ENFORCE_MODE;
if (isProduction && rawEnforceMode !== "enforce" && rawEnforceMode !== "shadow") {
  // "shadow" (log-only, never block) is the right DEFAULT for local dev,
  // but it is fail-open: in production, a missing or typo'd
  // GATEWAY_ENFORCE_MODE silently disabling all enforcement — while every
  // health check stays green — is the single worst failure mode this
  // service can have. Production must say explicitly which mode it wants.
  console.error(
    `GATEWAY_ENFORCE_MODE must be explicitly "enforce" or "shadow" in production (got: ${JSON.stringify(rawEnforceMode ?? null)}). ` +
      "Refusing to guess for an access-control gateway.",
  );
  process.exit(1);
}

export const env = {
  isProduction,
  port: Number(process.env.PORT) || 4200,
  // Defaults to a repo-root-relative path (not "./data/...", which would
  // resolve to a different directory per package depending on cwd) so the
  // gateway and admin-api share the same db file out of the box.
  dbPath: process.env.DB_PATH || "../data/gateway.sqlite",
  sharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
  enforceMode: rawEnforceMode === "enforce" ? ("enforce" as const) : ("shadow" as const),
  upstream: loadUpstreamConfigFromEnv(),
  rateLimit: {
    windowMs: Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.GATEWAY_RATE_LIMIT_MAX) || 300,
  },
  // How long allow/deny decisions are kept in gateway_access_log before the
  // daily sweep deletes them. tools/list writes one row per tool per
  // request, so at org scale this table grows fast without a bound.
  accessLogRetentionDays: Number(process.env.ACCESS_LOG_RETENTION_DAYS) || 90,
};

if (PLACEHOLDER_SECRETS.has(env.sharedSecret)) {
  const message =
    "GATEWAY_SHARED_SECRET is not set (or still the .env.example placeholder) — every request will be rejected until it is configured.";
  if (isProduction) {
    // Fail fast rather than boot into a broken/insecure state — a
    // production deployment silently running with no real secret would
    // reject 100% of real traffic with no obvious cause.
    console.error(message);
    process.exit(1);
  } else {
    console.warn(message);
  }
}

if (isProduction && env.enforceMode === "shadow") {
  // Explicitly chosen, so allowed — but shadow mode in production means
  // nothing is actually blocked. Say so loudly on every boot so it can't
  // be forgotten after the tagging-validation rollout phase ends.
  console.warn(
    "GATEWAY_ENFORCE_MODE=shadow in production: decisions are being LOGGED ONLY, nothing is blocked. " +
      "Switch to \"enforce\" once tool tagging has been validated against real traffic.",
  );
}
