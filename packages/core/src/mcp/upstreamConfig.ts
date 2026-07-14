export interface UpstreamConfig {
  transport: "http" | "stdio";
  serverUrl: string;
  stdioCommand: string;
  stdioArgs: string[];
  bearerToken: string;
  authHeaderName: string;
  authHeaderValue: string;
  extraHeaders: Record<string, string>;
}

function parseExtraHeaders(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => typeof v === "string"),
      ) as Record<string, string>;
    }
  } catch {
    console.warn("MCP_EXTRA_HEADERS is not valid JSON; ignoring it.");
  }
  return {};
}

/**
 * Reads the standard upstream-MCP-server env vars. Swapping from the bundled
 * mock server to the org's real MCP server is purely a matter of changing
 * these values (typically UPSTREAM_MCP_SERVER_URL) — no code change needed.
 */
export function loadUpstreamConfigFromEnv(env: NodeJS.ProcessEnv = process.env): UpstreamConfig {
  return {
    transport: env.MCP_TRANSPORT === "stdio" ? "stdio" : "http",
    serverUrl: env.UPSTREAM_MCP_SERVER_URL || "http://localhost:4000/mcp",
    stdioCommand: env.MCP_STDIO_COMMAND || "",
    stdioArgs: (env.MCP_STDIO_ARGS || "").split(" ").filter(Boolean),
    bearerToken: env.MCP_BEARER_TOKEN || "",
    authHeaderName: env.MCP_AUTH_HEADER_NAME || "",
    authHeaderValue: env.MCP_AUTH_HEADER_VALUE || "",
    extraHeaders: parseExtraHeaders(env.MCP_EXTRA_HEADERS),
  };
}
