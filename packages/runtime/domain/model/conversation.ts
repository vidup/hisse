import type { AgentId } from "./agent.js";
import { Message } from "./message.js";

export type ConversationId = string;

export class Conversation {
  private newEvents: Array<ConversationEvent> = [];
  private readonly _messages: Message[];

  constructor(
    public readonly id: ConversationId,
    public readonly title: string,
    public readonly agentId: AgentId,
    public readonly createdAt: Date,
    public updatedAt: Date,
    messages: Message[] = [],
    private readonly _events: Array<ConversationEvent> = [],
  ) {
    this._messages = [...messages].sort((a, b) => a.sequence - b.sequence);
    this.newEvents = _events;
  }

  get events(): Array<ConversationEvent> {
    return [...this.newEvents];
  }

  get messages(): Message[] {
    return [...this._messages];
  }

  touch(): void {
    this.updatedAt = new Date();
  }

  addUserMessage(content: string): Message {
    const message = Message.createUser({
      conversationId: this.id,
      sequence: this.nextSequence(),
      contentText: content,
    });
    this._messages.push(message);
    this.touch();
    return message;
  }

  addCompletedAssistantMessage(content: string): Message {
    const message = Message.createAssistantCompleted({
      conversationId: this.id,
      sequence: this.nextSequence(),
      contentText: content,
    });
    this._messages.push(message);
    this.touch();
    return message;
  }

  addFailedAssistantMessage(content: string, error: string): Message {
    const message = Message.createAssistantFailed({
      conversationId: this.id,
      sequence: this.nextSequence(),
      contentText: content,
      error,
    });
    this._messages.push(message);
    this.touch();
    return message;
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
    messages?: Message[];
  }): Conversation {
    return new Conversation(
      params.id,
      params.title,
      params.agentId,
      params.createdAt,
      params.updatedAt,
      params.messages ?? [],
    );
  }

  private nextSequence(): number {
    return this._messages.length === 0
      ? 1
      : Math.max(...this._messages.map((m) => m.sequence)) + 1;
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
