import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { FastifyInstance } from "fastify";
import {
  CreateTeamCommand,
  GetTeamsListQuery,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerTeamsRoutes(app: FastifyInstance) {
  app.get<{ Params: { workspaceId: string } }>(
    "/api/workspaces/:workspaceId/teams",
    async (request) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { workspaceId } = request.params;
      return handlers.getTeamsList.execute(new GetTeamsListQuery(workspaceId));
    },
  );

  app.post<{
    Params: { workspaceId: string };
    Body: { name: string; description: string; folderPath: string };
  }>("/api/workspaces/:workspaceId/teams", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { name, description, folderPath } = request.body;
    try {
      await handlers.createTeam.execute(new CreateTeamCommand(name, description, folderPath));
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  // Browse local folders for folder picker
  app.get<{ Querystring: { path?: string } }>("/api/folders", async (request, reply) => {
    const workspacePath = request.headers["x-workspace-path"];
    const defaultPath = typeof workspacePath === "string" ? workspacePath : homedir();
    const basePath = request.query.path || defaultPath;
    try {
      const resolved = resolve(basePath);
      const entries = await readdir(resolved, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => ({
          name: e.name,
          path: resolve(resolved, e.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parent = resolve(resolved, "..");
      return {
        current: resolved,
        parent: parent !== resolved ? parent : null,
        folders,
      };
    } catch {
      return reply.status(400).send({ error: "Cannot read directory" });
    }
  });
}
