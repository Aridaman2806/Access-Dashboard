import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 4400,
  sessionSecret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
  gatewayUrl: process.env.GATEWAY_URL || "http://localhost:4200/mcp",
  gatewaySharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
};

if (!env.gatewaySharedSecret) {
  console.warn(
    "GATEWAY_SHARED_SECRET is not set — the gateway will reject every request until it matches its own secret.",
  );
}
