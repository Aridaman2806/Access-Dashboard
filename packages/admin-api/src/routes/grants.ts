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
