import type { FastifyInstance } from "fastify";
import {
  CreateSkillCommand,
  GetSkillByIdQuery,
  GetSkillsQuery,
  UpdateSkillCommand,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerSkillsRoutes(app: FastifyInstance) {
  app.get<{ Params: { workspaceId: string } }>(
    "/api/workspaces/:workspaceId/skills",
    async (request) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { workspaceId } = request.params;
      return handlers.getSkills.execute(new GetSkillsQuery(workspaceId));
    },
  );

  app.get<{ Params: { id: string } }>("/api/skills/:id", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { id } = request.params;
    try {
      return await handlers.getSkillById.execute(new GetSkillByIdQuery(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{
    Params: { workspaceId: string };
    Body: { name: string; description: string; content: string };
  }>("/api/workspaces/:workspaceId/skills", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { name, description, content } = request.body;
    try {
      await handlers.createSkill.execute(new CreateSkillCommand(name, description, content));
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.put<{ Params: { id: string }; Body: { name: string; description: string; content: string } }>(
    "/api/skills/:id",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { id } = request.params;
      const { name, description, content } = request.body;
      try {
        await handlers.updateSkill.execute(new UpdateSkillCommand(id, name, description, content));
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
