import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentRuntime, AgentMessage } from "../../domain/ports/agent-runtime.js";

export class GetConversationQuery {
  constructor(public readonly conversationId: string) {}
}

export class GetConversationQueryHandler {
  constructor(
    private readonly conversationsRepo: ConversationsRepository,
    private readonly agentRuntime: AgentRuntime,
  ) {}

  async execute(query: GetConversationQuery) {
    const conversation = await this.conversationsRepo.findById(query.conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${query.conversationId}`);
    }

    let messages: AgentMessage[] = [];
    try {
      const session = await this.agentRuntime.resumeSession(conversation.id);
      messages = await session.getMessages();
      session.destroy();
    } catch {
      // Session may not exist yet
    }

    return {
      id: conversation.id,
      title: conversation.title,
      agentId: conversation.agentId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
    };
  }
}
