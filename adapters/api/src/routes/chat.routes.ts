import type { FastifyInstance } from "fastify";
import {
  StartConversationCommand,
  SendMessageCommand,
  GetConversationsQuery,
  GetConversationQuery,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerChatRoutes(app: FastifyInstance) {
  // List conversations
  app.get("/api/conversations", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getConversations.execute(new GetConversationsQuery());
  });

  // Get conversation with messages
  app.get<{ Params: { id: string } }>("/api/conversations/:id", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { id } = request.params;
    try {
      return await handlers.getConversation.execute(new GetConversationQuery(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      return reply.status(400).send({ error: message });
    }
  });

  // Start a new conversation (create + first message) — SSE stream
  app.post<{ Body: { content: string } }>("/api/conversations", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { content } = request.body;

    try {
      console.log("[chat] Starting conversation with:", content);
      const result = await handlers.startConversation.execute(new StartConversationCommand(content));
      console.log("[chat] Conversation created:", result.conversationId, "— starting SSE stream");

      // SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Stream conversationId immediately so the client can navigate
      reply.raw.write(`event: meta\ndata: ${JSON.stringify({ conversationId: result.conversationId, agentId: result.agentId })}\n\n`);

      // Stream agent response
      let fullContent = "";
      for await (const event of result.stream) {
        if (event.type === "text_delta") {
          fullContent += event.content;
          reply.raw.write(`event: delta\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
        } else if (event.type === "done") {
          reply.raw.write(`event: done\ndata: ${JSON.stringify({ conversationId: result.conversationId, agentId: result.agentId })}\n\n`);
        } else if (event.type === "error") {
          reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: event.error })}\n\n`);
        }
      }

      reply.raw.end();
    } catch (error) {
      console.error("[chat] Error starting conversation:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  // Send message to existing conversation — SSE stream
  app.post<{ Params: { id: string }; Body: { content: string } }>(
    "/api/conversations/:id/messages",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { id } = request.params;
      const { content } = request.body;

      try {
        const result = await handlers.sendMessage.execute(new SendMessageCommand(id, content));

        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        for await (const event of result.stream) {
          if (event.type === "text_delta") {
            reply.raw.write(`event: delta\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
          } else if (event.type === "done") {
            reply.raw.write(`event: done\ndata: ${JSON.stringify({ conversationId: id, agentId: result.agentId })}\n\n`);
          } else if (event.type === "error") {
            reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: event.error })}\n\n`);
          }
        }

        reply.raw.end();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );
}
