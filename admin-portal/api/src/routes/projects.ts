import { Router } from "express";
import {
  addProjectMember,
  createProject,
  getProject,
  getUserByEmail,
  recordAudit,
  removeProjectMember,
  searchProjects,
  upsertUser,
  type Db,
} from "@mcp-access/core";
import { getProjectAccessView } from "../services/accessViews.js";

export function createProjectsRouter(deps: { db: Db }): Router {
  const router = Router();
  const { db } = deps;

  router.get("/", (req, res) => {
    res.json(searchProjects(db, String(req.query.q ?? "")));
  });

  router.post("/", (req, res) => {
    const { code, name } = req.body as { code?: string; name?: string };
    if (!code || !name) {
      res.status(400).json({ error: "code and name are required" });
      return;
    }
    const project = createProject(db, { code, name });
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "project.create",
      targetType: "project",
      targetId: code,
      details: { name },
    });
    res.status(201).json(project);
  });

  router.get("/:code", (req, res) => {
    const project = getProject(db, req.params.code);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  });

  router.get("/:code/access", (req, res) => {
    const view = getProjectAccessView(db, req.params.code);
    if (!view) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(view);
  });

  router.post("/:code/members", (req, res) => {
    const { userEmail, userName } = req.body as { userEmail?: string; userName?: string };
    if (!userEmail) {
      res.status(400).json({ error: "userEmail is required" });
      return;
    }
    if (!getUserByEmail(db, userEmail)) {
      if (!userName) {
        res.status(400).json({ error: "userName is required to create a new user record" });
        return;
      }
      upsertUser(db, { email: userEmail, name: userName });
    }
    addProjectMember(db, { projectCode: req.params.code, userEmail, addedBy: req.session.adminEmail! });
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "project.member.add",
      targetType: "project",
      targetId: req.params.code,
      details: { userEmail },
    });
    res.status(201).json({ ok: true });
  });

  router.delete("/:code/members/:email", (req, res) => {
    removeProjectMember(db, req.params.code, req.params.email);
    recordAudit(db, {
      actorEmail: req.session.adminEmail!,
      action: "project.member.remove",
      targetType: "project",
      targetId: req.params.code,
      details: { userEmail: req.params.email },
    });
    res.json({ ok: true });
  });

  return router;
}
