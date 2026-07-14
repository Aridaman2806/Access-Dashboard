import express from "express";
import cors from "cors";
import session from "express-session";
import { createUpstreamClient, migrate, openDb } from "@mcp-access/core";
import { env } from "./env.js";
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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  }),
);

app.get("/health", (_req, res) => res.json({ status: "up" }));
app.use("/auth", createAuthRouter());

app.use(requireAdmin);
app.use("/users", createUsersRouter({ db }));
app.use("/tools", createToolsRouter({ db, upstreamClient }));
app.use("/grants", createGrantsRouter({ db }));
app.use("/projects", createProjectsRouter({ db }));
app.use("/projects", createProjectGrantsRouter({ db }));
app.use("/audit-log", createAuditLogRouter({ db }));
app.use("/dashboard", createDashboardRouter({ db, upstreamClient }));

app.listen(env.port, () => {
  console.log(`admin-api listening on http://localhost:${env.port}`);
});
