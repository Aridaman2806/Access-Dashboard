import express from "express";
import cors from "cors";
import session from "express-session";
import { env } from "./env.js";
import { createAuthRouter, requireAuth } from "./auth.js";
import { createToolsRouter } from "./routes/tools.js";

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
app.use("/tools", requireAuth, createToolsRouter());

app.listen(env.port, () => {
  console.log(`mock-agent-builder-api listening on http://localhost:${env.port}`);
  console.log(`Forwarding identity to gateway at ${env.gatewayUrl}`);
});
