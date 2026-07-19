import type { UpstreamToolSummary } from "./upstreamClient.js";

const META_TAG_KEYS = ["tags", "departmentTags", "department_tags"];

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return strings.length > 0 ? strings : undefined;
}

/**
 * Best-effort extraction of a department tag list from an upstream tool's
 * metadata, for auto-populating the Tool Registry on sync.
 *
 * Only checks `_meta` — the MCP spec's one open-dictionary field. A
 * nonstandard top-level `tags` field, or a custom key stuffed into
 * `annotations`, is silently stripped by the SDK's own response validation
 * before this function ever sees it (see the comment on `UpstreamToolSummary`
 * in upstreamClient.ts), so those locations are deliberately not checked
 * here — checking them would just always return undefined and give a false
 * sense of coverage.
 *
 * Checks a few plausible key names inside `_meta` since the exact key an
 * org's MCP server uses isn't standardized. Returns `[]` (not found) rather
 * than throwing — callers should treat that as "fall back to manual
 * tagging", not an error.
 */
export function extractTagsFromUpstreamTool(tool: UpstreamToolSummary): string[] {
  const meta = tool._meta;
  if (!meta || typeof meta !== "object") return [];

  for (const key of META_TAG_KEYS) {
    const found = asStringArray(meta[key]);
    if (found) return found;
  }

  return [];
}
