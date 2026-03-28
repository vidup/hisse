import type { AgentId } from "./agent.js";
import {
  answerQuestionnaireArtifact,
  createAssistantTurnEntry,
  createUserTurnEntry,
  type AssistantTurnEntry,
  type ConversationActivity,
  type ConversationArtifact,
  type ConversationPlan,
  type ConversationQuestionAnswerInput,
  type ConversationEntry,
  type QuestionnaireArtifact,
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

  addCompletedAssistantTurn(
    text: string,
    activities: ConversationActivity[] = [],
    plan?: ConversationPlan,
    artifacts: ConversationArtifact[] = [],
  ): AssistantTurnEntry {
    const entry = createAssistantTurnEntry({
      conversationId: this.id,
      sequence: this.nextSequence(),
      text,
      status: "completed",
      activities,
      plan,
      artifacts,
    });
    this._entries.push(entry);
    this.touch();
    return entry;
  }

  addFailedAssistantTurn(
    text: string,
    error: string,
    activities: ConversationActivity[] = [],
    plan?: ConversationPlan,
    artifacts: ConversationArtifact[] = [],
  ): AssistantTurnEntry {
    const entry = createAssistantTurnEntry({
      conversationId: this.id,
      sequence: this.nextSequence(),
      text,
      status: "failed",
      error,
      activities,
      plan,
      artifacts,
    });
    this._entries.push(entry);
    this.touch();
    return entry;
  }

  answerQuestionnaire(
    artifactId: string,
    answers: ConversationQuestionAnswerInput[],
  ): QuestionnaireArtifact {
    for (const entry of this._entries) {
      if (entry.kind !== "assistant_turn") {
        continue;
      }

      const artifact = entry.artifacts.find(
        (candidate): candidate is QuestionnaireArtifact =>
          candidate.kind === "questionnaire" && candidate.id === artifactId,
      );

      if (!artifact) {
        continue;
      }

      const answeredArtifact = answerQuestionnaireArtifact(artifact, answers);
      entry.artifacts = entry.artifacts.map((candidate) =>
        candidate.id === artifactId ? answeredArtifact : candidate,
      );
      this.touch();
      return answeredArtifact;
    }

    throw new Error(`Questionnaire artifact not found: ${artifactId}`);
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
