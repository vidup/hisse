import type { FastifyInstance } from "fastify";
import type {
  CreateAgentCommandHandler,
  GetAgentConfigurationQueryHandler,
  GetAgentsQueryHandler,
} from "@hisse/runtime";
import { CreateAgentCommand, GetAgentConfigurationQuery, GetAgentsQuery } from "@hisse/runtime";

interface AgentsHandlers {
  getAgents: GetAgentsQueryHandler;
  getAgentConfiguration: GetAgentConfigurationQueryHandler;
  createAgent: CreateAgentCommandHandler;
}

export function registerAgentsRoutes(app: FastifyInstance, handlers: AgentsHandlers) {
  app.get<{ Params: { workspaceId: string } }>(
    "/api/workspaces/:workspaceId/agents",
    async (request) => {
      const { workspaceId } = request.params;
      return handlers.getAgents.execute(new GetAgentsQuery(workspaceId));
    },
  );

  app.get<{ Params: { id: string } }>("/api/agents/:id/configuration", async (request, reply) => {
    const { id } = request.params;
    try {
      return await handlers.getAgentConfiguration.execute(new GetAgentConfigurationQuery(id));
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
    Body: {
      name: string;
      description: string;
      systemPrompt: string;
      provider: string;
      model: string;
      tools: string[];
      skills: string[];
    };
  }>("/api/workspaces/:workspaceId/agents", async (request, reply) => {
    const { workspaceId } = request.params;
    const { name, description, systemPrompt, provider, model, tools, skills } = request.body;
    try {
      await handlers.createAgent.execute(
        new CreateAgentCommand(
          workspaceId,
          name,
          description,
          systemPrompt,
          provider,
          model,
          tools,
          skills,
        ),
      );
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
