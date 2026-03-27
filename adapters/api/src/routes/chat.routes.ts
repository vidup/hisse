import type { FastifyInstance, FastifyReply } from "fastify";
import {
  StartConversationCommand,
  SendMessageCommand,
  GetConversationsQuery,
  GetConversationQuery,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

type ChatStreamChunk =
  | { type: "meta"; conversationId: string; agentId: string }
  | { type: "delta"; content: string }
  | { type: "done"; conversationId: string; agentId: string; fullContent: string }
  | { type: "error"; conversationId: string; agentId: string; error: string };

function beginStream(reply: FastifyReply) {
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
}

function writeStreamChunk(reply: FastifyReply, chunk: ChatStreamChunk) {
  if (!reply.raw.writableEnded) {
    reply.raw.write(`${JSON.stringify(chunk)}\n`);
  }
}

async function pipeChatStream(params: {
  reply: FastifyReply;
  conversationId: string;
  agentId: string;
  stream: AsyncIterable<
    | { type: "text_delta"; content: string }
    | { type: "done"; fullContent: string }
    | { type: "error"; error: string }
  >;
}) {
  beginStream(params.reply);
  writeStreamChunk(params.reply, {
    type: "meta",
    conversationId: params.conversationId,
    agentId: params.agentId,
  });

  try {
    for await (const event of params.stream) {
      if (event.type === "text_delta") {
        writeStreamChunk(params.reply, { type: "delta", content: event.content });
        continue;
      }

      if (event.type === "done") {
        writeStreamChunk(params.reply, {
          type: "done",
          conversationId: params.conversationId,
          agentId: params.agentId,
          fullContent: event.fullContent,
        });
        continue;
      }

      writeStreamChunk(params.reply, {
        type: "error",
        conversationId: params.conversationId,
        agentId: params.agentId,
        error: event.error,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    writeStreamChunk(params.reply, {
      type: "error",
      conversationId: params.conversationId,
      agentId: params.agentId,
      error: message,
    });
  } finally {
    if (!params.reply.raw.writableEnded) {
      params.reply.raw.end();
    }
  }
}

export function registerChatRoutes(app: FastifyInstance) {
  app.get("/api/conversations", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getConversations.execute(new GetConversationsQuery());
  });

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

  app.post<{ Body: { content: string } }>("/api/conversations", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { content } = request.body;

    try {
      const result = await handlers.startConversation.execute(new StartConversationCommand(content));
      await pipeChatStream({
        reply,
        conversationId: result.conversationId,
        agentId: result.agentId,
        stream: result.stream,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string }; Body: { content: string } }>(
    "/api/conversations/:id/messages",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { id } = request.params;
      const { content } = request.body;

      try {
        const result = await handlers.sendMessage.execute(new SendMessageCommand(id, content));
        await pipeChatStream({
          reply,
          conversationId: result.conversationId,
          agentId: result.agentId,
          stream: result.stream,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );
}
