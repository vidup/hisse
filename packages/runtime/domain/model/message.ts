export type MessageId = string;
export type MessageRole = "user" | "assistant";
export type MessageStatus = "completed" | "failed";

export class Message {
  constructor(
    public readonly id: MessageId,
    public readonly conversationId: string,
    public readonly role: MessageRole,
    public readonly sequence: number,
    public readonly contentText: string,
    public readonly status: MessageStatus,
    public readonly createdAt: Date,
    public readonly completedAt: Date,
    public readonly error?: string,
    public readonly providerMessageRef?: string,
  ) {}

  static createUser(params: { conversationId: string; sequence: number; contentText: string }): Message {
    const now = new Date();
    return new Message(
      crypto.randomUUID(),
      params.conversationId,
      "user",
      params.sequence,
      params.contentText,
      "completed",
      now,
      now,
    );
  }

  static createAssistantCompleted(params: {
    conversationId: string;
    sequence: number;
    contentText: string;
    providerMessageRef?: string;
  }): Message {
    const now = new Date();
    return new Message(
      crypto.randomUUID(),
      params.conversationId,
      "assistant",
      params.sequence,
      params.contentText,
      "completed",
      now,
      now,
      undefined,
      params.providerMessageRef,
    );
  }

  static createAssistantFailed(params: {
    conversationId: string;
    sequence: number;
    contentText: string;
    error: string;
    providerMessageRef?: string;
  }): Message {
    const now = new Date();
    return new Message(
      crypto.randomUUID(),
      params.conversationId,
      "assistant",
      params.sequence,
      params.contentText,
      "failed",
      now,
      now,
      params.error,
      params.providerMessageRef,
    );
  }

  static rehydrate(params: {
    id: MessageId;
    conversationId: string;
    role: MessageRole;
    sequence: number;
    contentText: string;
    status: MessageStatus;
    createdAt: Date;
    completedAt: Date;
    error?: string;
    providerMessageRef?: string;
  }): Message {
    return new Message(
      params.id,
      params.conversationId,
      params.role,
      params.sequence,
      params.contentText,
      params.status,
      params.createdAt,
      params.completedAt,
      params.error,
      params.providerMessageRef,
    );
  }
}
