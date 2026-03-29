import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { GetToolsQuery } from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers, resolveWorkspace } from "../workspace.js";

export function registerToolsRoutes(app: FastifyInstance) {
  app.get("/api/tools", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getTools.execute(new GetToolsQuery());
  });

  app.get<{ Params: { name: string } }>("/api/tools/:name", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const ws = resolveWorkspace(workspacePath);
    const toolDir = path.join(ws.tools, request.params.name);

    try {
      const dirents = await readdir(toolDir);
      const files: Record<string, string> = {};
      for (const entry of dirents) {
        const filePath = path.join(toolDir, entry);
        try {
          const content = await readFile(filePath, "utf-8");
          files[entry] = content;
        } catch {
          // skip non-readable files
        }
      }
      return { name: request.params.name, codePath: toolDir, files };
    } catch {
      return reply.status(404).send({ error: "Tool not found" });
    }
  });
}
