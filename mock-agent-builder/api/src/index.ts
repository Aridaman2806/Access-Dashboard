import express from "express";
import cors from "cors";
import session from "express-session";
import { env } from "./env.js";
import { createAuthRouter, requireAuth } from "./auth.js";
import { createToolsRouter } from "./routes/tools.js";

if (process.env.NODE_ENV === "production") {
  // This app exists purely to demo the gateway locally -- it has hardcoded
  // test accounts with their passwords shown right on the login page. The
  // real agent builder platform (a separate system, doing real Azure AD SSO)
  // is what should be pointed at the gateway in production, never this.
  console.error(
    "mock-agent-builder-api is a local testing tool and must not run in production -- " +
      "point the real agent builder platform at the gateway instead.",
  );
  process.exit(1);
}

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
