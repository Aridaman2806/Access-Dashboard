import { Router } from "express";
import {
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
    const upstreamTools = await upstreamClient.listTools();
    const synced = upstreamTools.map((t) => upsertTool(db, { name: t.name, description: t.description ?? null }));
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "tools.sync",
      targetType: "tool",
      targetId: "*",
      details: { count: synced.length, names: synced.map((t) => t.name) },
    });
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
