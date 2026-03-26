import type { AgentId } from "./agent.js";

export type ConversationId = string;

export class Conversation {
  private newEvents: Array<ConversationEvent> = [];

  constructor(
    public readonly id: ConversationId,
    public readonly title: string,
    public readonly agentId: AgentId,
    public readonly createdAt: Date,
    public updatedAt: Date,
    private readonly _events: Array<ConversationEvent> = [],
  ) {
    this.newEvents = _events;
  }

  get events(): Array<ConversationEvent> {
    return [...this.newEvents];
  }

  touch(): void {
    this.updatedAt = new Date();
  }

  static create(params: { title: string; agentId: AgentId }): Conversation {
    const id = crypto.randomUUID();
    const now = new Date();
    return new Conversation(id, params.title, params.agentId, now, now, [
      new ConversationCreatedEvent(id, params.title, params.agentId, now),
    ]);
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
