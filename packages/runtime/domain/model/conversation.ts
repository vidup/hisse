import type { AgentId } from "./agent.js";
import {
  createAssistantTurnEntry,
  createUserTurnEntry,
  type AssistantTurnEntry,
  type ConversationActivity,
  type ConversationEntry,
  type UserTurnEntry,
} from "./message.js";

export type ConversationId = string;

export class Conversation {
  private newEvents: Array<ConversationEvent> = [];
  private readonly _entries: ConversationEntry[];

  constructor(
    public readonly id: ConversationId,
    public readonly title: string,
    public readonly agentId: AgentId,
    public readonly createdAt: Date,
    public updatedAt: Date,
    entries: ConversationEntry[] = [],
    private readonly _events: Array<ConversationEvent> = [],
  ) {
    this._entries = [...entries].sort((a, b) => a.sequence - b.sequence);
    this.newEvents = _events;
  }

  get events(): Array<ConversationEvent> {
    return [...this.newEvents];
  }

  get entries(): ConversationEntry[] {
    return [...this._entries];
  }

  touch(): void {
    this.updatedAt = new Date();
  }

  addUserTurn(text: string): UserTurnEntry {
    const entry = createUserTurnEntry({
      conversationId: this.id,
      sequence: this.nextSequence(),
      text,
    });
    this._entries.push(entry);
    this.touch();
    return entry;
  }

  addCompletedAssistantTurn(text: string, activities: ConversationActivity[] = []): AssistantTurnEntry {
    const entry = createAssistantTurnEntry({
      conversationId: this.id,
      sequence: this.nextSequence(),
      text,
      status: "completed",
      activities,
    });
    this._entries.push(entry);
    this.touch();
    return entry;
  }

  addFailedAssistantTurn(
    text: string,
    error: string,
    activities: ConversationActivity[] = [],
  ): AssistantTurnEntry {
    const entry = createAssistantTurnEntry({
      conversationId: this.id,
      sequence: this.nextSequence(),
      text,
      status: "failed",
      error,
      activities,
    });
    this._entries.push(entry);
    this.touch();
    return entry;
  }

  static create(params: { title: string; agentId: AgentId }): Conversation {
    const id = crypto.randomUUID();
    const now = new Date();
    return new Conversation(id, params.title, params.agentId, now, now, [], [
      new ConversationCreatedEvent(id, params.title, params.agentId, now),
    ]);
  }

  static rehydrate(params: {
    id: ConversationId;
    title: string;
    agentId: AgentId;
    createdAt: Date;
    updatedAt: Date;
    entries?: ConversationEntry[];
  }): Conversation {
    return new Conversation(
      params.id,
      params.title,
      params.agentId,
      params.createdAt,
      params.updatedAt,
      params.entries ?? [],
    );
  }

  private nextSequence(): number {
    return this._entries.length === 0
      ? 1
      : Math.max(...this._entries.map((entry) => entry.sequence)) + 1;
  }
}

export class ConversationCreatedEvent {
  constructor(
    public readonly conversationId: ConversationId,
    public readonly title: string,
    public readonly agentId: AgentId,
    public readonly createdAt: Date,
  ) {}
}

export type ConversationEvent = ConversationCreatedEvent;
