import type { FastifyInstance } from "fastify";
import {
  GetConnectorsQuery,
  GetConnectorByProviderQuery,
  SaveApiKeyConnectorCommand,
  SaveOAuthConnectorCommand,
  RemoveConnectorCommand,
} from "@hisse/connectors";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerConnectorsRoutes(app: FastifyInstance) {
  app.get<{ Params: { workspaceId: string } }>(
    "/api/workspaces/:workspaceId/connectors",
    async (request) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      return handlers.getConnectors.execute(new GetConnectorsQuery());
    },
  );

  app.get<{ Params: { workspaceId: string; provider: string } }>(
    "/api/workspaces/:workspaceId/connectors/:provider",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { provider } = request.params;
      const connector = await handlers.getConnectorByProvider.execute(
        new GetConnectorByProviderQuery(provider),
      );
      if (!connector) {
        return reply.status(404).send({ error: `Connector not found: ${provider}` });
      }
      return connector;
    },
  );

  app.post<{
    Params: { workspaceId: string };
    Body: { provider: string; apiKey: string };
  }>("/api/workspaces/:workspaceId/connectors/api-key", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { provider, apiKey } = request.body;
    try {
      await handlers.saveApiKeyConnector.execute(
        new SaveApiKeyConnectorCommand(provider, apiKey),
      );
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{
    Params: { workspaceId: string };
    Body: {
      provider: string;
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    };
  }>("/api/workspaces/:workspaceId/connectors/oauth", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { provider, accessToken, refreshToken, expiresAt } = request.body;
    try {
      await handlers.saveOAuthConnector.execute(
        new SaveOAuthConnectorCommand(provider, accessToken, refreshToken, expiresAt),
      );
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.delete<{ Params: { workspaceId: string; provider: string } }>(
    "/api/workspaces/:workspaceId/connectors/:provider",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { provider } = request.params;
      await handlers.removeConnector.execute(new RemoveConnectorCommand(provider));
      return reply.status(200).send({ ok: true });
    },
  );
}
