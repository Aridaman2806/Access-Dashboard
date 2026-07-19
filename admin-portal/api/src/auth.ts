import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { env } from "./env.js";

declare module "express-session" {
  interface SessionData {
    adminEmail?: string;
  }
}

/** Constant-time comparison — a plain `!==` leaks timing proportional to the matching prefix. */
function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  // Length check first: lengths aren't secret, and timingSafeEqual throws
  // on mismatched buffer lengths rather than returning false.
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/** Single hardcoded admin account for MVP — flagged for hardening before production. */
export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (typeof email !== "string" || typeof password !== "string" || email !== env.adminEmail || !secretsMatch(password, env.adminPassword)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    // Regenerate the session id on privilege change (anonymous -> admin) so a
    // session id captured/planted before login can't be promoted to an
    // authenticated one (session fixation).
    req.session.regenerate((err) => {
      if (err) {
        res.status(500).json({ error: "Login failed" });
        return;
      }
      req.session.adminEmail = email;
      res.json({ email });
    });
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
