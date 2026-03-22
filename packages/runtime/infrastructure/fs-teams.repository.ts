import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Team, TeamId } from "../domain/model/team.js";
import { WorkspaceId } from "../domain/model/workspace.js";
import type { TeamsRepository } from "../domain/ports/teams.repository.js";

interface TeamMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class FsTeamsRepository implements TeamsRepository {
  private cache: Map<TeamId, Team> | null = null;

  constructor(private readonly basePath: string) {}

  async save(team: Team): Promise<void> {
    const slug = slugify(team.name);
    const dir = path.join(this.basePath, slug);
    await mkdir(dir, { recursive: true });

    const meta: TeamMeta = {
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };

    await writeFile(path.join(dir, "team.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");

    if (this.cache) {
      this.cache.set(team.id, team);
    }
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

    let entries: string[];
    try {
      const dirents = await readdir(this.basePath, { withFileTypes: true });
      entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return;
    }

    for (const entry of entries) {
      const dir = path.join(this.basePath, entry);
      try {
        const metaRaw = await readFile(path.join(dir, "team.json"), "utf-8");
        const meta: TeamMeta = JSON.parse(metaRaw);

        const team = new Team(
          meta.id,
          meta.name,
          meta.description,
          new Date(meta.createdAt),
          new Date(meta.updatedAt),
        );
        this.cache.set(team.id, team);
      } catch {
        // Skip malformed team directories
      }
    }
  }
}
