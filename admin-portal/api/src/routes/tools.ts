import { Router } from "express";
import {
  extractTagsFromUpstreamTool,
  getTool,
  getToolDepartmentTags,
  getToolsByDepartmentTag,
  getUntaggedTools,
  listDistinctDepartmentTags,
  listTools,
  recordAudit,
  searchTools,
  setToolActive,
  setToolDepartmentTags,
  upsertTool,
  type Db,
  type UpstreamClient,
} from "@mcp-access/core";
import { getToolAccessView } from "../services/accessViews.js";
import { env } from "../env.js";

/** Sentinel value for the "Untagged" tile — not a real department tag. */
const UNTAGGED = "__untagged__";

export function createToolsRouter(deps: { db: Db; upstreamClient: UpstreamClient }): Router {
  const router = Router();
  const { db, upstreamClient } = deps;

  function withTags(tool: ReturnType<typeof getTool>) {
    if (!tool) return tool;
    return { ...tool, departmentTags: getToolDepartmentTags(db, tool.name) };
  }

  router.get("/tags", (_req, res) => {
    const tags = listDistinctDepartmentTags(db);
    const untaggedCount = getUntaggedTools(db).length;
    res.json({ tags, untaggedCount });
  });

  router.get("/", (req, res) => {
    const tag = req.query.tag ? String(req.query.tag) : undefined;
    let tools;
    if (tag === UNTAGGED) {
      tools = getUntaggedTools(db);
    } else if (tag) {
      tools = getToolsByDepartmentTag(db, tag);
    } else if (req.query.q) {
      tools = searchTools(db, String(req.query.q));
    } else {
      tools = listTools(db);
    }
    res.json(tools.map((t) => withTags(t)));
  });

  router.get("/:name", (req, res) => {
    const tool = withTags(getTool(db, req.params.name));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json(tool);
  });

  router.get("/:name/access", async (req, res) => {
    const view = await getToolAccessView(db, req.params.name);
    if (!view) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json(view);
  });

  router.post("/sync", async (req, res) => {
    let upstreamTools;
    try {
      upstreamTools = await upstreamClient.listTools();
    } catch (error) {
      // The upstream MCP server being unreachable/erroring is an expected,
      // recoverable failure (network blip, server restart, bad config) --
      // NOT something that should ever crash this process. Express 4 does
      // not auto-catch async route rejections, so without this try/catch a
      // single failed sync takes down the entire admin portal for everyone
      // until it's manually restarted.
      console.error("Tool sync failed to reach upstream MCP server:", error);
      res.status(502).json({
        error: `Could not reach the upstream MCP server (${env.upstream.serverUrl}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return;
    }

    const synced = upstreamTools.map((t) => upsertTool(db, { name: t.name, description: t.description ?? null }));

    // Best-effort auto-tagging from upstream metadata (see core/src/mcp/toolTags.ts).
    // Only applied to tools with zero tags today, so a manual admin
    // correction always wins and re-running sync is never destructive.
    const autoTagged: { tool: string; tags: string[] }[] = [];
    for (const upstreamTool of upstreamTools) {
      if (getToolDepartmentTags(db, upstreamTool.name).length > 0) continue;
      const detected = extractTagsFromUpstreamTool(upstreamTool);
      if (detected.length > 0) {
        setToolDepartmentTags(db, upstreamTool.name, detected);
        autoTagged.push({ tool: upstreamTool.name, tags: detected });
      }
    }

    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "tools.sync",
      targetType: "tool",
      targetId: "*",
      details: { count: synced.length, names: synced.map((t) => t.name) },
    });
    if (autoTagged.length > 0) {
      recordAudit(db, {
        actorEmail: req.session.adminEmail!,
        action: "tool.tags.auto_detected",
        targetType: "tool",
        targetId: "*",
        details: { autoTagged },
      });
    }

    res.json(synced.map((t) => withTags(t)));
  });

  router.put("/:name/tags", (req, res) => {
    const { tags } = req.body as { tags?: string[] };
    if (!Array.isArray(tags)) {
      res.status(400).json({ error: "tags must be an array of strings" });
      return;
    }
    const tool = getTool(db, req.params.name);
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    setToolDepartmentTags(db, req.params.name, tags);
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "tool.tags.set",
      targetType: "tool",
      targetId: req.params.name,
      details: { tags },
    });
    res.json(withTags(getTool(db, req.params.name)));
  });

  router.put("/:name/active", (req, res) => {
    const { isActive } = req.body as { isActive?: boolean };
    const tool = getTool(db, req.params.name);
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    setToolActive(db, req.params.name, Boolean(isActive));
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "tool.active.set",
      targetType: "tool",
      targetId: req.params.name,
      details: { isActive: Boolean(isActive) },
    });
    res.json(withTags(getTool(db, req.params.name)));
  });

  return router;
}
