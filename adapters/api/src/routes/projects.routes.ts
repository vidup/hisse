import type { FastifyInstance } from "fastify";
import {
  GetProjectsByTeamQuery,
  CreateProjectCommand,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerProjectsRoutes(app: FastifyInstance) {
  app.get<{ Params: { teamId: string } }>(
    "/api/teams/:teamId/projects",
    async (request) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { teamId } = request.params;
      return handlers.getProjectsByTeam.execute(new GetProjectsByTeamQuery(teamId));
    },
  );

  app.post<{
    Params: { teamId: string };
    Body: { name: string; path: string; workflowId: string };
  }>("/api/teams/:teamId/projects", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { teamId } = request.params;
    const { name, path, workflowId } = request.body;
    try {
      await handlers.createProject.execute(new CreateProjectCommand(name, path, teamId, workflowId));
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
