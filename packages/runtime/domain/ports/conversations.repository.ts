import type { Conversation, ConversationId } from "../model/conversation.js";

export interface ConversationsRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: ConversationId): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
}
