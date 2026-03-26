import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Conversation, type ConversationId } from "../domain/model/conversation.js";
import type { ConversationsRepository } from "../domain/ports/conversations.repository.js";

interface ConversationMeta {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

export class FsConversationsRepository implements ConversationsRepository {
  constructor(private readonly basePath: string) {}

  async save(conversation: Conversation): Promise<void> {
    const dir = path.join(this.basePath, conversation.id);
    await mkdir(dir, { recursive: true });

    const meta: ConversationMeta = {
      id: conversation.id,
      title: conversation.title,
      agentId: conversation.agentId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };

    await writeFile(path.join(dir, "conversation.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");
  }

  async findById(id: ConversationId): Promise<Conversation | null> {
    const filePath = path.join(this.basePath, id, "conversation.json");
    try {
      const raw = await readFile(filePath, "utf-8");
      const meta: ConversationMeta = JSON.parse(raw);
      return new Conversation(
        meta.id,
        meta.title,
        meta.agentId,
        new Date(meta.createdAt),
        new Date(meta.updatedAt),
      );
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Conversation[]> {
    const conversations: Conversation[] = [];

    let entries: string[];
    try {
      const dirents = await readdir(this.basePath, { withFileTypes: true });
      entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return [];
    }

    for (const entry of entries) {
      try {
        const raw = await readFile(path.join(this.basePath, entry, "conversation.json"), "utf-8");
        const meta: ConversationMeta = JSON.parse(raw);
        conversations.push(
          new Conversation(
            meta.id,
            meta.title,
            meta.agentId,
            new Date(meta.createdAt),
            new Date(meta.updatedAt),
          ),
        );
      } catch {
        // Skip malformed
      }
    }

    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}
