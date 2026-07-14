import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { env } from "./env.js";

declare module "express-session" {
  interface SessionData {
    adminEmail?: string;
  }
}

/** Single hardcoded admin account for MVP — flagged for hardening before production. */
export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (email !== env.adminEmail || password !== env.adminPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.adminEmail = email;
    res.json({ email });
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get("/me", (req, res) => {
    if (!req.session.adminEmail) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ email: req.session.adminEmail });
  });

  return router;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.adminEmail) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
