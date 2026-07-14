import { Router } from "express";
import { listAuditLog, type Db } from "@mcp-access/core";

export function createAuditLogRouter(deps: { db: Db }): Router {
  const router = Router();
  const { db } = deps;

  router.get("/", (req, res) => {
    const limit = Number(req.query.limit) || 100;
    const offset = Number(req.query.offset) || 0;
    res.json(listAuditLog(db, { limit, offset }));
  });

  return router;
}
