import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { FastifyInstance } from "fastify";
import type {
  CreateTeamCommandHandler,
  GetTeamWorkflowQueryHandler,
  GetTeamsListQueryHandler,
  UpdateTeamWorkflowCommandHandler,
} from "@hisse/runtime";
import {
  CreateTeamCommand,
  GetTeamWorkflowQuery,
  GetTeamsListQuery,
  UpdateTeamWorkflowCommand,
} from "@hisse/runtime";

interface TeamsHandlers {
  getTeamsList: GetTeamsListQueryHandler;
  getTeamWorkflow: GetTeamWorkflowQueryHandler;
  createTeam: CreateTeamCommandHandler;
  updateTeamWorkflow: UpdateTeamWorkflowCommandHandler;
}

export function registerTeamsRoutes(app: FastifyInstance, handlers: TeamsHandlers) {
  app.get<{ Params: { workspaceId: string } }>(
    "/api/workspaces/:workspaceId/teams",
    async (request) => {
      const { workspaceId } = request.params;
      return handlers.getTeamsList.execute(new GetTeamsListQuery(workspaceId));
    },
  );

  app.get<{ Params: { id: string } }>("/api/teams/:id/workflow", async (request, reply) => {
    const { id } = request.params;
    try {
      return await handlers.getTeamWorkflow.execute(new GetTeamWorkflowQuery(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      return reply.status(400).send({ error: message });
    }
  });

  // Browse local folders for folder picker
  app.get<{ Querystring: { path?: string } }>("/api/folders", async (request, reply) => {
    const basePath = request.query.path || homedir();
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

  app.post<{
    Params: { workspaceId: string };
    Body: { name: string; description: string; folderPath: string };
  }>("/api/workspaces/:workspaceId/teams", async (request, reply) => {
    const { name, description, folderPath } = request.body;
    try {
      await handlers.createTeam.execute(new CreateTeamCommand(name, description, folderPath));
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.put<{ Params: { id: string }; Body: { steps: string[] } }>(
    "/api/teams/:id/workflow",
    async (request, reply) => {
      const { id } = request.params;
      const { steps } = request.body;
      try {
        await handlers.updateTeamWorkflow.execute(new UpdateTeamWorkflowCommand(id, steps));
        return reply.status(200).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.includes("not found")) {
          return reply.status(404).send({ error: message });
        }
        return reply.status(400).send({ error: message });
      }
    },
  );
}
