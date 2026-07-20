import type { UpstreamToolSummary } from "./upstreamClient.js";

const TAG_KEYS = ["tags", "departmentTags", "department_tags"];

function asStringArray(value: unknown): string[] | undefined {
  // Tolerate a bare string too (e.g. tags="hc" instead of tags=["hc"]) --
  // cheap to support, and we don't control how the upstream server
  // serializes this.
  if (typeof value === "string" && value.trim().length > 0) return [value.trim()];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return strings.length > 0 ? strings : undefined;
}

function readTagKey(container: unknown): string[] | undefined {
  if (!container || typeof container !== "object") return undefined;
  const record = container as Record<string, unknown>;
  for (const key of TAG_KEYS) {
    const found = asStringArray(record[key]);
    if (found) return found;
  }
  return undefined;
}

/**
 * Best-effort extraction of a department tag list from an upstream tool's
 * metadata, for auto-populating the Tool Registry on sync.
 *
 * Checks, in order of how likely an org's MCP server is to put it there:
 * 1. Top-level on the raw tool object (`tool.raw.tags`) — confirmed to be
 *    where at least one real org's server puts it: a Python
 *    `@mcp.tool(tags={"hc"}, ...)` decorator argument serialized as a
 *    sibling field next to `name`/`description`, not nested inside
 *    `annotations` or `_meta`. This only reaches us because `listTools()`
 *    validates each tool against a raw, permissive envelope rather than the
 *    SDK's own strict parse, which would otherwise silently strip it.
 * 2. Inside `annotations` (`tool.raw.annotations.tags`) — in case a
 *    different server nests it there instead.
 * 3. Inside `_meta` (`tool._meta.tags`) — the one field the MCP spec itself
 *    blesses as an open dictionary for exactly this kind of vendor data.
 *
 * Returns `[]` (not found) rather than throwing — callers should treat that
 * as "fall back to manual tagging in the Tool Registry," not an error.
 */
export function extractTagsFromUpstreamTool(tool: UpstreamToolSummary): string[] {
  return readTagKey(tool.raw) ?? readTagKey(tool.raw?.annotations) ?? readTagKey(tool._meta) ?? [];
}
