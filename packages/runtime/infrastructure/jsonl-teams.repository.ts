import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Team, TeamId, TaskId } from "../domain/model/team.js";
import { WorkspaceId } from "../domain/model/workspace.js";
import type { TeamsRepository } from "../domain/ports/teams.repository.js";

interface TeamRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  folderPath: string;
  workflow: string[];
  backlog: string[];
}

export class JsonlTeamsRepository implements TeamsRepository {
  private cache: Map<TeamId, Team> | null = null;

  constructor(private readonly filePath: string) {}

  async save(team: Team): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(team.id, team);
    await this.persist();
  }

  async findById(teamId: TeamId): Promise<Team | null> {
    await this.ensureLoaded();
    return this.cache!.get(teamId) ?? null;
  }

  async findAllByWorkspaceId(_workspaceId: WorkspaceId): Promise<Team[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values());
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache !== null) return;

    this.cache = new Map();

    let content: string;
    try {
      content = await readFile(this.filePath, "utf-8");
    } catch {
      return;
    }

    const lines = content.split("\n").filter((line) => line.trim() !== "");
    for (const line of lines) {
      const record: TeamRecord = JSON.parse(line);
      const team = new Team(
        record.id,
        record.name,
        record.description,
        new Date(record.createdAt),
        new Date(record.updatedAt),
        record.folderPath,
        record.workflow,
        record.backlog,
      );
      this.cache.set(team.id, team);
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const team of this.cache!.values()) {
      const record: TeamRecord = {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
        folderPath: team.folderPath,
        workflow: [...team.workflow],
        backlog: [...team.backlog],
      };
      lines.push(JSON.stringify(record));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
