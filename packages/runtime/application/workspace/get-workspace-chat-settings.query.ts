import type { WorkspaceChatSettingsRepository } from "../../domain/ports/workspace-chat-settings.repository.js";
import type { WorkspaceId } from "../../domain/model/workspace.js";

export class GetWorkspaceChatSettingsQuery {
  constructor(public readonly workspaceId: WorkspaceId) {}
}

export class GetWorkspaceChatSettingsQueryHandler {
  constructor(private readonly workspaceChatSettingsRepo: WorkspaceChatSettingsRepository) {}

  execute(query: GetWorkspaceChatSettingsQuery) {
    return this.workspaceChatSettingsRepo.get(query.workspaceId);
  }
}
