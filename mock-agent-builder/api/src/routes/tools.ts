import { Router } from "express";
import { callAllowedTool, listAllowedTools } from "../gatewayClient.js";

export function createToolsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const tools = await listAllowedTools(req.session.user!);
      res.json(tools);
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Gateway unreachable" });
    }
  });

  router.post("/:name/call", async (req, res) => {
    const { arguments: args } = req.body as { arguments?: Record<string, unknown> };
    try {
      const result = await callAllowedTool(req.session.user!, req.params.name, args ?? {});
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "Gateway unreachable" });
    }
  });

  return router;
}
