import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";

export class GetConversationsQuery {}

export class GetConversationsQueryHandler {
  constructor(private readonly conversationsRepo: ConversationsRepository) {}

  async execute(_query: GetConversationsQuery) {
    const conversations = await this.conversationsRepo.findAll();
    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      agentId: c.agentId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }
}
