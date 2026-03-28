import type { FastifyInstance } from "fastify";
import {
  GetWorkspaceChatSettingsQuery,
  SetDefaultChatAgentCommand,
} from "@hisse/runtime";
import { createHandlers, getWorkspaceFromRequest } from "../workspace.js";

export function registerWorkspaceSettingsRoutes(app: FastifyInstance) {
  app.get<{ Params: { workspaceId: string } }>(
    "/api/workspaces/:workspaceId/settings/chat",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { workspaceId } = request.params;

      try {
        return await handlers.getWorkspaceChatSettings.execute(
          new GetWorkspaceChatSettingsQuery(workspaceId),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.put<{
    Params: { workspaceId: string };
    Body: { defaultChatAgentId: string | null };
  }>("/api/workspaces/:workspaceId/settings/chat", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { workspaceId } = request.params;
    const { defaultChatAgentId } = request.body;

    try {
      await handlers.setDefaultChatAgent.execute(
        new SetDefaultChatAgentCommand(workspaceId, defaultChatAgentId),
      );
      return reply.status(200).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
