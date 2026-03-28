import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Conversation, type ConversationId } from "../domain/model/conversation.js";
import {
  rehydrateConversationEntry,
  type AssistantTurnStatus,
  type ConversationActivity,
  type ConversationPlan,
  type ConversationEntry,
} from "../domain/model/message.js";
import type { ConversationsRepository } from "../domain/ports/conversations.repository.js";

interface ConversationMeta {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationActivityMeta {
  id: string;
  kind: ConversationActivity["kind"];
  name: string;
  label: string;
  status: ConversationActivity["status"];
  startedAt: string;
  completedAt?: string;
}

interface ConversationPlanMeta {
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "in_progress" | "completed";
  }>;
  updatedAt: string;
}

type ConversationEntryMeta =
  | {
      id: string;
      conversationId: string;
      kind: "user_turn";
      sequence: number;
      text: string;
      createdAt: string;
      completedAt: string;
    }
  | {
      id: string;
      conversationId: string;
      kind: "assistant_turn";
      sequence: number;
      text: string;
      status: AssistantTurnStatus;
      createdAt: string;
      completedAt: string;
      error?: string;
      providerMessageRef?: string;
      activities?: ConversationActivityMeta[];
      plan?: ConversationPlanMeta;
    };

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

    const transcript = conversation.entries
      .map((entry) =>
        JSON.stringify(
          entry.kind === "user_turn"
            ? {
                id: entry.id,
                conversationId: entry.conversationId,
                kind: entry.kind,
                sequence: entry.sequence,
                text: entry.text,
                createdAt: entry.createdAt.toISOString(),
                completedAt: entry.completedAt.toISOString(),
              }
            : {
                id: entry.id,
                conversationId: entry.conversationId,
                kind: entry.kind,
                sequence: entry.sequence,
                text: entry.text,
                status: entry.status,
                createdAt: entry.createdAt.toISOString(),
                completedAt: entry.completedAt.toISOString(),
                error: entry.error,
                providerMessageRef: entry.providerMessageRef,
                activities: entry.activities.map((activity) => ({
                  id: activity.id,
                  kind: activity.kind,
                  name: activity.name,
                  label: activity.label,
                  status: activity.status,
                  startedAt: activity.startedAt.toISOString(),
                  completedAt: activity.completedAt?.toISOString(),
                })),
                plan: entry.plan
                  ? {
                      steps: entry.plan.steps.map((step) => ({
                        id: step.id,
                        label: step.label,
                        status: step.status,
                      })),
                      updatedAt: entry.plan.updatedAt.toISOString(),
                    }
                  : undefined,
              } satisfies ConversationEntryMeta,
        ),
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
      const entries = await this.readCanonicalEntries(path.join(this.basePath, id));
      return Conversation.rehydrate({
        id: meta.id,
        title: meta.title,
        agentId: meta.agentId,
        createdAt: new Date(meta.createdAt),
        updatedAt: new Date(meta.updatedAt),
        entries,
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

  private async readCanonicalEntries(conversationDir: string): Promise<ConversationEntry[]> {
    const transcriptPath = path.join(conversationDir, "transcript.jsonl");

    let raw: string;
    try {
      raw = await readFile(transcriptPath, "utf-8");
    } catch {
      return [];
    }

    const entries: ConversationEntry[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;

      try {
        const meta: ConversationEntryMeta = JSON.parse(line);
        if (meta.kind === "user_turn") {
          entries.push(
            rehydrateConversationEntry({
              id: meta.id,
              conversationId: meta.conversationId,
              kind: meta.kind,
              sequence: meta.sequence,
              text: meta.text,
              createdAt: new Date(meta.createdAt),
              completedAt: new Date(meta.completedAt),
            }),
          );
          continue;
        }

        entries.push(
          rehydrateConversationEntry({
            id: meta.id,
            conversationId: meta.conversationId,
            kind: meta.kind,
            sequence: meta.sequence,
            text: meta.text,
            status: meta.status,
            createdAt: new Date(meta.createdAt),
            completedAt: new Date(meta.completedAt),
            error: meta.error,
            providerMessageRef: meta.providerMessageRef,
            activities: (meta.activities ?? []).map((activity) => ({
              id: activity.id,
              kind: activity.kind,
              name: activity.name,
              label: activity.label,
              status: activity.status,
              startedAt: new Date(activity.startedAt),
              completedAt: activity.completedAt ? new Date(activity.completedAt) : undefined,
            })),
            plan: meta.plan
              ? {
                  steps: meta.plan.steps.map((step) => ({
                    id: step.id,
                    label: step.label,
                    status: step.status,
                  })),
                  updatedAt: new Date(meta.plan.updatedAt),
                } satisfies ConversationPlan
              : undefined,
          }),
        );
      } catch {
        // Skip malformed transcript lines
      }
    }

    return entries.sort((a, b) => a.sequence - b.sequence);
  }
}
