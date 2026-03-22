import type { FastifyInstance } from "fastify";
import {
  CreateWorkflowCommand,
  UpdateWorkflowCommand,
  GetWorkflowsListQuery,
  GetWorkflowByIdQuery,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerWorkflowsRoutes(app: FastifyInstance) {
  app.get("/api/workflows", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getWorkflowsList.execute(new GetWorkflowsListQuery());
  });

  app.get<{ Params: { id: string } }>("/api/workflows/:id", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { id } = request.params;
    try {
      return await handlers.getWorkflowById.execute(new GetWorkflowByIdQuery(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{ Body: { name: string; description: string } }>(
    "/api/workflows",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { name, description } = request.body;
      try {
        await handlers.createWorkflow.execute(new CreateWorkflowCommand(name, description));
        return reply.status(201).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.put<{ Params: { id: string }; Body: { steps: string[] } }>(
    "/api/workflows/:id",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { id } = request.params;
      const { steps } = request.body;
      try {
        await handlers.updateWorkflow.execute(new UpdateWorkflowCommand(id, steps));
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
