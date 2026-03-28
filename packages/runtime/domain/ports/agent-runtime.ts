import type { ConversationActivity } from "../model/message.js";

export type AgentStreamEvent =
  | { type: "text_delta"; content: string }
  | { type: "activity_start"; activity: ConversationActivity }
  | { type: "activity_update"; activity: ConversationActivity }
  | { type: "activity_end"; activity: ConversationActivity }
  | { type: "done"; fullContent: string }
  | { type: "error"; error: string };

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  }): Promise<AgentSessionHandle>;

  resumeSession(sessionId: string): Promise<AgentSessionHandle>;
}
