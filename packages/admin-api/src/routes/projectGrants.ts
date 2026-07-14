import { Router } from "express";
import { grantToolToProject, recordAudit, revokeProjectGrant, type Db } from "@mcp-access/core";

export function createProjectGrantsRouter(deps: { db: Db }): Router {
  const router = Router();
  const { db } = deps;

  router.post("/:code/grants", (req, res) => {
    const { toolName } = req.body as { toolName?: string };
    if (!toolName) {
      res.status(400).json({ error: "toolName is required" });
      return;
    }
    const grant = grantToolToProject(db, { projectCode: req.params.code, toolName, grantedBy: req.session.adminEmail! });
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "grant.project.create",
      targetType: "project_grant",
      targetId: grant.id,
      details: { projectCode: req.params.code, toolName },
    });
    res.status(201).json(grant);
  });

  /** Bulk-grant a set of tools to every member of a project code in one action. */
  router.post("/:code/grants/bulk", (req, res) => {
    const { toolNames } = req.body as { toolNames?: string[] };
    if (!Array.isArray(toolNames) || toolNames.length === 0) {
      res.status(400).json({ error: "toolNames must be a non-empty array" });
      return;
    }
    const grants = toolNames.map((toolName) =>
      grantToolToProject(db, { projectCode: req.params.code, toolName, grantedBy: req.session.adminEmail! }),
    );
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "grant.project.bulk_create",
      targetType: "project",
      targetId: req.params.code,
      details: { toolNames },
    });
    res.status(201).json(grants);
  });

  router.delete("/:code/grants/:id", (req, res) => {
    revokeProjectGrant(db, req.params.id, req.session.adminEmail!);
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "grant.project.revoke",
      targetType: "project_grant",
      targetId: req.params.id,
      details: { projectCode: req.params.code },
    });
    res.json({ ok: true });
  });

  return router;
}
