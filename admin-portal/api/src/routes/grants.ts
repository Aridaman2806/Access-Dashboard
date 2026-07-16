import { Router } from "express";
import { getUserByEmail, grantToolToUser, recordAudit, revokeIndividualGrant, upsertUser, type Db } from "@mcp-access/core";

export function createGrantsRouter(deps: { db: Db }): Router {
  const router = Router();
  const { db } = deps;

  router.post("/", (req, res) => {
    const { userEmail, userName, toolName } = req.body as {
      userEmail?: string;
      userName?: string;
      toolName?: string;
    };
    if (!userEmail || !toolName) {
      res.status(400).json({ error: "userEmail and toolName are required" });
      return;
    }

    const existing = getUserByEmail(db, userEmail);
    if (!existing) {
      if (!userName) {
        res.status(400).json({ error: "userName is required to create a new user record" });
        return;
      }
      upsertUser(db, { email: userEmail, name: userName });
    }

    const grant = grantToolToUser(db, { userEmail, toolName, grantedBy: req.session.adminEmail! });
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "grant.individual.create",
      targetType: "individual_grant",
      targetId: grant.id,
      details: { userEmail, toolName },
    });
    res.status(201).json(grant);
  });

  /** Grants a set of tools to one user in a single action. */
  router.post("/bulk", (req, res) => {
    const { userEmail, userName, toolNames } = req.body as {
      userEmail?: string;
      userName?: string;
      toolNames?: string[];
    };
    if (!userEmail || !Array.isArray(toolNames) || toolNames.length === 0) {
      res.status(400).json({ error: "userEmail and a non-empty toolNames array are required" });
      return;
    }

    if (!getUserByEmail(db, userEmail)) {
      if (!userName) {
        res.status(400).json({ error: "userName is required to create a new user record" });
        return;
      }
      upsertUser(db, { email: userEmail, name: userName });
    }

    const grants = toolNames.map((toolName) =>
      grantToolToUser(db, { userEmail, toolName, grantedBy: req.session.adminEmail! }),
    );
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "grant.individual.bulk_create",
      targetType: "user",
      targetId: userEmail,
      details: { toolNames },
    });
    res.status(201).json(grants);
  });

  router.delete("/:id", (req, res) => {
    revokeIndividualGrant(db, req.params.id, req.session.adminEmail!);
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "grant.individual.revoke",
      targetType: "individual_grant",
      targetId: req.params.id,
    });
    res.json({ ok: true });
  });

  return router;
}
