import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import session from "express-session";
import { createUpstreamClient, migrate, openDb } from "@mcp-access/core";
import { env } from "./env.js";
import { SqliteSessionStore } from "./sessionStore.js";
import { createAuthRouter, requireAdmin } from "./auth.js";
import { createUsersRouter } from "./routes/users.js";
import { createToolsRouter } from "./routes/tools.js";
import { createGrantsRouter } from "./routes/grants.js";
import { createProjectsRouter } from "./routes/projects.js";
import { createProjectGrantsRouter } from "./routes/projectGrants.js";
import { createAuditLogRouter } from "./routes/auditLog.js";
import { createDashboardRouter } from "./routes/dashboard.js";

const db = openDb(env.dbPath);
migrate(db);
const upstreamClient = createUpstreamClient(env.upstream);

const app = express();
// Needed so express-session sees the request as HTTPS (via X-Forwarded-Proto)
// when a reverse proxy/load balancer terminates TLS in front of this app --
// otherwise a "secure" cookie would never get set behind such a proxy.
app.set("trust proxy", 1);

// In production, only the real admin-frontend origin(s) may make credentialed
// (cookie-based) requests. `origin: true` reflects back *any* requesting
// origin, which combined with credentials is a real CORS misconfiguration
// for a session-cookie API reachable from a browser -- only safe to fall
// back to for local dev, where there's no real origin to leak credentials to.
app.use(
  cors(
    env.adminFrontendOrigins.length > 0
      ? { origin: env.adminFrontendOrigins, credentials: true }
      : { origin: true, credentials: true },
  ),
);
app.use(express.json());
// Never logs the session cookie's value or any header contents beyond
// morgan's standard combined/dev format (method, path, status, timing).
app.use(morgan(env.isProduction ? "combined" : "dev", { skip: (req) => req.path === "/health" }));
app.use(
  session({
    // SQLite-backed store on the shared db: sessions survive restarts and
    // there's no MemoryStore leak (see sessionStore.ts).
    store: new SqliteSessionStore(db),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: env.isProduction },
  }),
);

app.get("/health", (_req, res) => res.json({ status: "up" }));

// Brute-force protection on the admin login specifically, not the whole /auth router.
app.use(
  "/auth/login",
  rateLimit({ windowMs: env.loginRateLimit.windowMs, limit: env.loginRateLimit.max, standardHeaders: true, legacyHeaders: false }),
);
app.use("/auth", createAuthRouter());

app.use(requireAdmin);
app.use("/users", createUsersRouter({ db }));
app.use("/tools", createToolsRouter({ db, upstreamClient }));
app.use("/grants", createGrantsRouter({ db }));
app.use("/projects", createProjectsRouter({ db }));
app.use("/projects", createProjectGrantsRouter({ db }));
app.use("/audit-log", createAuditLogRouter({ db }));
app.use("/dashboard", createDashboardRouter({ db, upstreamClient }));

// Safety net: Express 4 does not auto-catch rejections thrown by an async
// route handler, so an unhandled one becomes an uncaught exception that
// crashes the whole process (Node terminates on unhandled rejections by
// default) -- a single bad request taking down every admin, org-wide, until
// someone manually restarts it. Every route that can fail should already
// have its own try/catch (see routes/tools.ts's /sync), but this backstops
// anything missed, current or future, with a clean 500 instead of a crash.
// Must be registered last and take exactly 4 params for Express to treat it
// as an error handler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error in admin-api request:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

process.on("unhandledRejection", (reason) => {
  // Final backstop beyond Express's own request lifecycle (e.g. a rejection
  // in a detached background operation). Log and keep running rather than
  // let Node's default behavior terminate the process.
  console.error("Unhandled promise rejection in admin-api:", reason);
});

app.listen(env.port, () => {
  console.log(`admin-api listening on http://localhost:${env.port}`);
});
