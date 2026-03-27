import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";

export class GetConversationQuery {
  constructor(public readonly conversationId: string) {}
}

export class GetConversationQueryHandler {
  constructor(private readonly conversationsRepo: ConversationsRepository) {}

  async execute(query: GetConversationQuery) {
    const conversation = await this.conversationsRepo.findById(query.conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${query.conversationId}`);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      agentId: conversation.agentId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((message) => ({
        role: message.role,
        content: message.contentText,
        timestamp: (message.completedAt ?? message.createdAt).toISOString(),
      })),
    };
  }
}
