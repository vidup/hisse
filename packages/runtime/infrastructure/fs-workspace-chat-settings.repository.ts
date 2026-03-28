import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkspaceChatSettings } from "../domain/model/workspace-chat-settings.js";
import type { WorkspaceChatSettingsRepository } from "../domain/ports/workspace-chat-settings.repository.js";
import type { WorkspaceId } from "../domain/model/workspace.js";

interface WorkspaceChatSettingsMeta {
  workspaceId: WorkspaceId;
  defaultChatAgentId: string | null;
}

export class FsWorkspaceChatSettingsRepository implements WorkspaceChatSettingsRepository {
  constructor(private readonly filePath: string) {}

  async get(workspaceId: WorkspaceId): Promise<WorkspaceChatSettings> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const data: WorkspaceChatSettingsMeta = JSON.parse(raw);
      return new WorkspaceChatSettings(data.workspaceId ?? workspaceId, data.defaultChatAgentId);
    } catch {
      return WorkspaceChatSettings.createDefault(workspaceId);
    }
  }

  async save(settings: WorkspaceChatSettings): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const data: WorkspaceChatSettingsMeta = {
      workspaceId: settings.workspaceId,
      defaultChatAgentId: settings.defaultChatAgentId,
    };

    await writeFile(this.filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }
}
