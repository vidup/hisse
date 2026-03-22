import type { FastifyInstance } from "fastify";
import { AddStepToLibraryCommand, GetStepsLibraryQuery } from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

interface Transport {
  type: string;
  target: string;
  configuration: Record<string, unknown>;
  authenticated: boolean;
}

export function registerLibraryRoutes(app: FastifyInstance) {
  app.get("/api/steps", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getStepsLibrary.execute(new GetStepsLibraryQuery("default"));
  });

  app.post<{
    Body: {
      name: string;
      description: string;
      parameters:
        | { kind: "agent"; agentId: string }
        | { kind: "human"; transports: Array<Transport> };
    };
  }>("/api/steps", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { name, description, parameters } = request.body;
    try {
      await handlers.addStepToLibrary.execute(
        new AddStepToLibraryCommand(name, description, parameters),
      );
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
