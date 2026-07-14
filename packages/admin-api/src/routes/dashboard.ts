import { Router } from "express";
import { getToolDepartmentTags, listTools, type Db, type UpstreamClient } from "@mcp-access/core";
import { env } from "../env.js";

export function createDashboardRouter(deps: { db: Db; upstreamClient: UpstreamClient }): Router {
  const router = Router();
  const { db, upstreamClient } = deps;

  router.get("/", async (_req, res) => {
    const serverInfo = await upstreamClient.getServerInfo();
    const tools = listTools(db).map((tool) => ({
      ...tool,
      departmentTags: getToolDepartmentTags(db, tool.name),
    }));

    res.json({
      upstream: {
        ...serverInfo,
        transport: env.upstream.transport,
        serverUrl: env.upstream.serverUrl,
        authConfigured: Boolean(
          env.upstream.bearerToken || env.upstream.authHeaderName || Object.keys(env.upstream.extraHeaders).length,
        ),
      },
      tools,
    });
  });

  return router;
}
