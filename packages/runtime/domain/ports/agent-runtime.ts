import type { ConversationActivity, ConversationPlan, ConversationPlanStepStatus } from "../model/message.js";

export type AgentStreamEvent =
  | { type: "text_delta"; content: string }
  | { type: "activity_start"; activity: ConversationActivity }
  | { type: "activity_update"; activity: ConversationActivity }
  | { type: "activity_end"; activity: ConversationActivity }
  | { type: "plan_update"; plan: ConversationPlan }
  | { type: "done"; fullContent: string }
  | { type: "error"; error: string };

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AgentSkillAccess {
  id: string;
  name: string;
  description: string;
}

export interface AgentPlanStepInput {
  id: string;
  label: string;
  status: ConversationPlanStepStatus;
}

export interface AgentSessionHandle {
  prompt(message: string): AsyncIterable<AgentStreamEvent>;
  getMessages(): Promise<AgentMessage[]>;
  destroy(): void;
}

export interface AgentRuntime {
  createSession(params: {
    sessionId: string;
    systemPrompt: string;
    provider: string;
    model: string;
    availableSkills: AgentSkillAccess[];
  }): Promise<AgentSessionHandle>;

  resumeSession(params: {
    sessionId: string;
    availableSkills: AgentSkillAccess[];
  }): Promise<AgentSessionHandle>;
}
