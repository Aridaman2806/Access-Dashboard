import { Router } from "express";
import { countUsers, listActiveIndividualGrantsForUser, searchUsers, upsertUser, type Db } from "@mcp-access/core";
import { getUserAccessView } from "../services/accessViews.js";

export function createUsersRouter(deps: { db: Db }): Router {
  const router = Router();
  const { db } = deps;

  router.get("/count", (_req, res) => {
    res.json({ count: countUsers(db) });
  });

  router.get("/", (req, res) => {
    res.json(searchUsers(db, String(req.query.q ?? "")));
  });

  router.post("/", (req, res) => {
    const { email, name, department } = req.body as { email?: string; name?: string; department?: string | null };
    if (!email || !name) {
      res.status(400).json({ error: "email and name are required" });
      return;
    }
    res.status(201).json(upsertUser(db, { email, name, department: department ?? null }));
  });

  router.get("/:email/grants", (req, res) => {
    res.json(listActiveIndividualGrantsForUser(db, req.params.email));
  });

  router.get("/:email/access", async (req, res) => {
    const view = await getUserAccessView(db, req.params.email);
    if (!view) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(view);
  });

  return router;
}
