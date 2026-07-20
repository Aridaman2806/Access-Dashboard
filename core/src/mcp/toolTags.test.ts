import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTagsFromUpstreamTool } from "./toolTags.js";
import type { UpstreamToolSummary } from "./upstreamClient.js";

function tool(overrides: Partial<UpstreamToolSummary> & { raw?: Record<string, unknown> }): UpstreamToolSummary {
  return { name: "some_tool", raw: {}, ...overrides };
}

test("finds tags at the top level of the raw tool object (confirmed real-world shape: a Python @mcp.tool(tags={...}) decorator argument serialized as a sibling field)", () => {
  const result = extractTagsFromUpstreamTool(tool({ raw: { tags: ["hc"] } }));
  assert.deepEqual(result, ["hc"]);
});

test("finds tags nested inside raw.annotations as a fallback location", () => {
  const result = extractTagsFromUpstreamTool(tool({ raw: { annotations: { tags: ["engineering"] } } }));
  assert.deepEqual(result, ["engineering"]);
});

test("finds tags under _meta.tags as a final fallback (the one MCP-spec-blessed open field)", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { tags: ["hc"] } }));
  assert.deepEqual(result, ["hc"]);
});

test("finds tags under _meta.departmentTags as an alternate key name", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { departmentTags: ["engineering", "finance"] } }));
  assert.deepEqual(result, ["engineering", "finance"]);
});

test("finds tags under _meta.department_tags as another alternate key name", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { department_tags: ["hr"] } }));
  assert.deepEqual(result, ["hr"]);
});

test("raw top-level tags win over annotations and _meta when multiple are present", () => {
  const result = extractTagsFromUpstreamTool(
    tool({ raw: { tags: ["from-top-level"], annotations: { tags: ["from-annotations"] } }, _meta: { tags: ["from-meta"] } }),
  );
  assert.deepEqual(result, ["from-top-level"]);
});

test("accepts a bare string instead of an array (tags=\"hc\")", () => {
  const result = extractTagsFromUpstreamTool(tool({ raw: { tags: "hc" } }));
  assert.deepEqual(result, ["hc"]);
});

test("returns [] when nothing is present anywhere", () => {
  assert.deepEqual(extractTagsFromUpstreamTool(tool({})), []);
});

test("returns [] when no recognized tag key exists in any location", () => {
  assert.deepEqual(extractTagsFromUpstreamTool(tool({ raw: { someOtherField: "x" }, _meta: { alsoNotIt: 1 } })), []);
});

test("returns [] when the tag value is present but an empty array", () => {
  assert.deepEqual(extractTagsFromUpstreamTool(tool({ raw: { tags: [] } })), []);
});

test("filters out non-string entries within a tags array", () => {
  const result = extractTagsFromUpstreamTool(tool({ raw: { tags: ["hc", 42, null, "  ", "finance"] as unknown[] } }));
  assert.deepEqual(result, ["hc", "finance"]);
});
