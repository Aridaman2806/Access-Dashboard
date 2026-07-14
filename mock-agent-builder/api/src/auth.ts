import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { DEMO_ACCOUNTS } from "./accounts.js";

declare module "express-session" {
  interface SessionData {
    user?: { email: string; name: string };
  }
}

export function createAuthRouter(): Router {
  const router = Router();

  /** Demo-only: lets the login page show which accounts/passwords exist. */
  router.get("/demo-accounts", (_req, res) => {
    res.json(DEMO_ACCOUNTS);
  });

  router.post("/login", (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const account = DEMO_ACCOUNTS.find((a) => a.email === email && a.password === password);
    if (!account) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.user = { email: account.email, name: account.name };
    res.json({ email: account.email, name: account.name });
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get("/me", (req, res) => {
    if (!req.session.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json(req.session.user);
  });

  return router;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
