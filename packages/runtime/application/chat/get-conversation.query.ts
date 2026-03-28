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
      entries: conversation.entries.map((entry) => ({
        kind: entry.kind,
        text: entry.text,
        status: entry.kind === "assistant_turn" ? entry.status : undefined,
        error: entry.kind === "assistant_turn" ? entry.error : undefined,
        timestamp: (entry.completedAt ?? entry.createdAt).toISOString(),
        activities: entry.kind === "assistant_turn"
          ? entry.activities.map((activity) => ({
              id: activity.id,
              kind: activity.kind,
              name: activity.name,
              label: activity.label,
              status: activity.status,
              startedAt: activity.startedAt.toISOString(),
              completedAt: activity.completedAt?.toISOString(),
            }))
          : [],
      })),
    };
  }
}
