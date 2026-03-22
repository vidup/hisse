import type { FastifyInstance } from "fastify";
import type {
  AddStepToLibraryCommandHandler,
  GetStepsLibraryQueryHandler,
} from "@hisse/runtime";
import {
  AddStepToLibraryCommand,
  GetStepsLibraryQuery,
} from "@hisse/runtime";

interface Transport {
  type: string;
  target: string;
  configuration: Record<string, unknown>;
  authenticated: boolean;
}

interface LibraryHandlers {
  getStepsLibrary: GetStepsLibraryQueryHandler;
  addStepToLibrary: AddStepToLibraryCommandHandler;
}

export function registerLibraryRoutes(
  app: FastifyInstance,
  handlers: LibraryHandlers,
) {
  app.get("/api/steps", async () => {
    return handlers.getStepsLibrary.execute(
      new GetStepsLibraryQuery("default"),
    );
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
    const { name, description, parameters } = request.body;
    try {
      await handlers.addStepToLibrary.execute(
        new AddStepToLibraryCommand(name, description, parameters),
      );
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
