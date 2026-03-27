import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Conversation, type ConversationId } from "../domain/model/conversation.js";
import { Message, type MessageRole, type MessageStatus } from "../domain/model/message.js";
import type { ConversationsRepository } from "../domain/ports/conversations.repository.js";

interface ConversationMeta {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageMeta {
  id: string;
  conversationId: string;
  role: MessageRole;
  sequence: number;
  contentText: string;
  status: MessageStatus;
  createdAt: string;
  completedAt: string;
  error?: string;
  providerMessageRef?: string;
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

    const transcript = conversation.messages
      .map((message) =>
        JSON.stringify({
          id: message.id,
          conversationId: message.conversationId,
          role: message.role,
          sequence: message.sequence,
          contentText: message.contentText,
          status: message.status,
          createdAt: message.createdAt.toISOString(),
          completedAt: message.completedAt.toISOString(),
          error: message.error,
          providerMessageRef: message.providerMessageRef,
        } satisfies MessageMeta),
      )
      .join("\n");

    await writeFile(
      path.join(dir, "transcript.jsonl"),
      transcript.length > 0 ? `${transcript}\n` : "",
      "utf-8",
    );
  }

  async findById(id: ConversationId): Promise<Conversation | null> {
    const filePath = path.join(this.basePath, id, "conversation.json");
    try {
      const raw = await readFile(filePath, "utf-8");
      const meta: ConversationMeta = JSON.parse(raw);
      const messages = await this.readCanonicalMessages(path.join(this.basePath, id));
      return Conversation.rehydrate({
        id: meta.id,
        title: meta.title,
        agentId: meta.agentId,
        createdAt: new Date(meta.createdAt),
        updatedAt: new Date(meta.updatedAt),
        messages,
      });
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
          Conversation.rehydrate({
            id: meta.id,
            title: meta.title,
            agentId: meta.agentId,
            createdAt: new Date(meta.createdAt),
            updatedAt: new Date(meta.updatedAt),
          }),
        );
      } catch {
        // Skip malformed
      }
    }

    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private async readCanonicalMessages(conversationDir: string): Promise<Message[]> {
    const transcriptPath = path.join(conversationDir, "transcript.jsonl");

    let raw: string;
    try {
      raw = await readFile(transcriptPath, "utf-8");
    } catch {
      return [];
    }

    const messages: Message[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const meta: MessageMeta = JSON.parse(line);
        messages.push(
          Message.rehydrate({
            id: meta.id,
            conversationId: meta.conversationId,
            role: meta.role,
            sequence: meta.sequence,
            contentText: meta.contentText,
            status: meta.status,
            createdAt: new Date(meta.createdAt),
            completedAt: new Date(meta.completedAt),
            error: meta.error,
            providerMessageRef: meta.providerMessageRef,
          }),
        );
      } catch {
        // Skip malformed transcript lines
      }
    }

    return messages.sort((a, b) => a.sequence - b.sequence);
  }
}
