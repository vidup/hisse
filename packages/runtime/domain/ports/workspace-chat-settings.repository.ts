import type { WorkspaceChatSettings } from "../model/workspace-chat-settings.js";
import type { WorkspaceId } from "../model/workspace.js";

export interface WorkspaceChatSettingsRepository {
  get(workspaceId: WorkspaceId): Promise<WorkspaceChatSettings>;
  save(settings: WorkspaceChatSettings): Promise<void>;
}
