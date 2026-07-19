import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Db } from "@mcp-access/core";
import { upsertUser } from "@mcp-access/core";
import { runWithIdentity } from "./identityContext.js";

/** Constant-time secret comparison — a plain `!==` leaks timing information proportional to how much of the prefix matches. */
function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  // Length check first: not secret-dependent (lengths aren't sensitive), and
  // timingSafeEqual throws on mismatched buffer lengths rather than
  // returning false, so this must happen before the real comparison.
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Trust boundary for the gateway: the agent builder platform (which already
 * authenticated the user via SSO) must present a shared secret plus the
 * user's identity as trusted headers on every call. Requests missing/failing
 * either check are rejected before any permission logic runs.
 */
export function createIdentityMiddleware(deps: { db: Db; sharedSecret: string }) {
  return function identityMiddleware(req: Request, res: Response, next: NextFunction): void {
    const providedSecret = req.header("X-Gateway-Auth");
    if (!deps.sharedSecret || !providedSecret || !secretsMatch(providedSecret, deps.sharedSecret)) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Missing or invalid X-Gateway-Auth" },
        id: null,
      });
      return;
    }

    const email = req.header("X-User-Email");
    const name = req.header("X-User-Name");
    const department = req.header("X-User-Department") || null;

    if (!email || !name) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32002, message: "Missing X-User-Email or X-User-Name header" },
        id: null,
      });
      return;
    }

    upsertUser(deps.db, { email, name, department });
    runWithIdentity({ email, name, department }, () => next());
  };
}
