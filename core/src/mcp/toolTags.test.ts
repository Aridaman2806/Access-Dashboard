import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTagsFromUpstreamTool } from "./toolTags.js";
import type { UpstreamToolSummary } from "./upstreamClient.js";

function tool(overrides: Partial<UpstreamToolSummary>): UpstreamToolSummary {
  return { name: "some_tool", ...overrides };
}

test("finds tags under _meta.tags", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { tags: ["hc"] } }));
  assert.deepEqual(result, ["hc"]);
});

test("finds tags under _meta.departmentTags as a fallback key name", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { departmentTags: ["engineering", "finance"] } }));
  assert.deepEqual(result, ["engineering", "finance"]);
});

test("finds tags under _meta.department_tags as another fallback key name", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { department_tags: ["hr"] } }));
  assert.deepEqual(result, ["hr"]);
});

test("returns [] when _meta is absent", () => {
  assert.deepEqual(extractTagsFromUpstreamTool(tool({})), []);
});

test("returns [] when _meta has no recognized tag key", () => {
  assert.deepEqual(extractTagsFromUpstreamTool(tool({ _meta: { someOtherField: "x" } })), []);
});

test("returns [] when the tag value is present but an empty array", () => {
  assert.deepEqual(extractTagsFromUpstreamTool(tool({ _meta: { tags: [] } })), []);
});

test("ignores a top-level tags field (would already be stripped by the SDK before reaching this function, so it must not be trusted)", () => {
  const withTopLevelTags = tool({}) as UpstreamToolSummary & { tags: string[] };
  withTopLevelTags.tags = ["should-be-ignored"];
  assert.deepEqual(extractTagsFromUpstreamTool(withTopLevelTags), []);
});

test("filters out non-string entries within a tags array", () => {
  const result = extractTagsFromUpstreamTool(tool({ _meta: { tags: ["hc", 42, null, "  ", "finance"] as unknown[] } }));
  assert.deepEqual(result, ["hc", "finance"]);
});
