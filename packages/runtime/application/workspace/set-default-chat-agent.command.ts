import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import type { AgentId } from "../../domain/model/agent.js";
import type { WorkspaceId } from "../../domain/model/workspace.js";
import type { WorkspaceChatSettingsRepository } from "../../domain/ports/workspace-chat-settings.repository.js";

export class SetDefaultChatAgentCommand {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly defaultChatAgentId: AgentId | null,
  ) {}
}

export class SetDefaultChatAgentCommandHandler {
  constructor(
    private readonly workspaceChatSettingsRepo: WorkspaceChatSettingsRepository,
    private readonly agentsRepo: AgentsRepository,
  ) {}

  async execute(command: SetDefaultChatAgentCommand): Promise<void> {
    if (command.defaultChatAgentId) {
      await this.agentsRepo.findById(command.defaultChatAgentId);
    }

    const currentSettings = await this.workspaceChatSettingsRepo.get(command.workspaceId);
    await this.workspaceChatSettingsRepo.save(
      currentSettings.withDefaultChatAgentId(command.defaultChatAgentId),
    );
  }
}
