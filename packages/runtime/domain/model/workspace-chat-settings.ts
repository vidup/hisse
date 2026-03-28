import type { AgentId } from "./agent.js";
import type { WorkspaceId } from "./workspace.js";

export class WorkspaceChatSettings {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly defaultChatAgentId: AgentId | null = null,
  ) {}

  static createDefault(workspaceId: WorkspaceId) {
    return new WorkspaceChatSettings(workspaceId, null);
  }

  withDefaultChatAgentId(defaultChatAgentId: AgentId | null) {
    return new WorkspaceChatSettings(this.workspaceId, defaultChatAgentId);
  }
}
