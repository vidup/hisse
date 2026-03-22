import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Project, ProjectId } from "../domain/model/project.js";
import { TeamId } from "../domain/model/team.js";
import type { ProjectsRepository } from "../domain/ports/projects.repository.js";

interface ProjectRecord {
  id: string;
  teamId: string;
  workflowId: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export class JsonlProjectsRepository implements ProjectsRepository {
  private cache: Map<ProjectId, Project> | null = null;

  constructor(private readonly filePath: string) {}

  async save(project: Project): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(project.id, project);
    await this.persist();
  }

  async findById(projectId: ProjectId): Promise<Project | null> {
    await this.ensureLoaded();
    return this.cache!.get(projectId) ?? null;
  }

  async findAllByTeamId(teamId: TeamId): Promise<Project[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values()).filter(
      (project) => project.teamId === teamId,
    );
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
      const record: ProjectRecord = JSON.parse(line);
      const project = new Project(
        record.id,
        record.teamId,
        record.workflowId,
        record.name,
        record.path,
        new Date(record.createdAt),
        new Date(record.updatedAt),
      );
      this.cache.set(project.id, project);
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const project of this.cache!.values()) {
      const record: ProjectRecord = {
        id: project.id,
        teamId: project.teamId,
        workflowId: project.workflowId,
        name: project.name,
        path: project.path,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
      lines.push(JSON.stringify(record));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
