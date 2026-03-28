export type ConversationEntryId = string;
export type ConversationActivityKind = "tool";
export type ConversationActivityStatus = "running" | "completed" | "failed";
export type AssistantTurnStatus = "in_progress" | "completed" | "failed";
export type ConversationPlanStepStatus = "pending" | "in_progress" | "completed";

export interface ConversationActivity {
  id: string;
  kind: ConversationActivityKind;
  name: string;
  label: string;
  status: ConversationActivityStatus;
  startedAt: Date;
  completedAt?: Date;
}

export interface ConversationPlanStep {
  id: string;
  label: string;
  status: ConversationPlanStepStatus;
}

export interface ConversationPlan {
  steps: ConversationPlanStep[];
  updatedAt: Date;
}

interface BaseConversationEntry {
  id: ConversationEntryId;
  conversationId: string;
  sequence: number;
  text: string;
  createdAt: Date;
  completedAt: Date;
}

export interface UserTurnEntry extends BaseConversationEntry {
  kind: "user_turn";
}

export interface AssistantTurnEntry extends BaseConversationEntry {
  kind: "assistant_turn";
  status: AssistantTurnStatus;
  error?: string;
  providerMessageRef?: string;
  activities: ConversationActivity[];
  plan?: ConversationPlan;
}

export type ConversationEntry = UserTurnEntry | AssistantTurnEntry;

export function createUserTurnEntry(params: {
  conversationId: string;
  sequence: number;
  text: string;
}): UserTurnEntry {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    conversationId: params.conversationId,
    kind: "user_turn",
    sequence: params.sequence,
    text: params.text,
    createdAt: now,
    completedAt: now,
  };
}

export function createAssistantTurnEntry(params: {
  conversationId: string;
  sequence: number;
  text: string;
  status: AssistantTurnStatus;
  error?: string;
  providerMessageRef?: string;
  activities?: ConversationActivity[];
  plan?: ConversationPlan;
}): AssistantTurnEntry {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    conversationId: params.conversationId,
    kind: "assistant_turn",
    sequence: params.sequence,
    text: params.text,
    status: params.status,
    createdAt: now,
    completedAt: now,
    error: params.error,
    providerMessageRef: params.providerMessageRef,
    activities: params.activities ?? [],
    plan: params.plan,
  };
}

export function rehydrateConversationEntry(params:
  | {
      id: ConversationEntryId;
      conversationId: string;
      kind: "user_turn";
      sequence: number;
      text: string;
      createdAt: Date;
      completedAt: Date;
    }
  | {
      id: ConversationEntryId;
      conversationId: string;
      kind: "assistant_turn";
      sequence: number;
      text: string;
      status: AssistantTurnStatus;
      createdAt: Date;
      completedAt: Date;
      error?: string;
      providerMessageRef?: string;
      activities?: ConversationActivity[];
      plan?: ConversationPlan;
    }
): ConversationEntry {
  if (params.kind === "user_turn") {
    return {
      id: params.id,
      conversationId: params.conversationId,
      kind: "user_turn",
      sequence: params.sequence,
      text: params.text,
      createdAt: params.createdAt,
      completedAt: params.completedAt,
    };
  }

  return {
    id: params.id,
    conversationId: params.conversationId,
    kind: "assistant_turn",
    sequence: params.sequence,
    text: params.text,
    status: params.status,
    createdAt: params.createdAt,
    completedAt: params.completedAt,
    error: params.error,
    providerMessageRef: params.providerMessageRef,
    activities: params.activities ?? [],
    plan: params.plan,
  };
}
