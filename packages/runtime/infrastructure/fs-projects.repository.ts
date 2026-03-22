import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
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

interface TeamMeta {
  id: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export class FsProjectsRepository implements ProjectsRepository {
  constructor(private readonly teamsBasePath: string) {}

  async save(project: Project): Promise<void> {
    const teamDir = await this.findTeamDir(project.teamId);
    if (!teamDir) {
      throw new Error(`Team directory not found for teamId: ${project.teamId}`);
    }

    const slug = slugify(project.name);
    const projectDir = path.join(this.teamsBasePath, teamDir, "projects", slug);
    await mkdir(projectDir, { recursive: true });

    const record: ProjectRecord = {
      id: project.id,
      teamId: project.teamId,
      workflowId: project.workflowId,
      name: project.name,
      path: project.path,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };

    await writeFile(
      path.join(projectDir, "project.json"),
      JSON.stringify(record, null, 2) + "\n",
      "utf-8",
    );
  }

  async findById(projectId: ProjectId): Promise<Project | null> {
    const teamDirs = await this.listTeamDirs();

    for (const teamDir of teamDirs) {
      const projectDirs = await this.listProjectDirs(teamDir);
      for (const projectDir of projectDirs) {
        try {
          const filePath = path.join(
            this.teamsBasePath,
            teamDir,
            "projects",
            projectDir,
            "project.json",
          );
          const raw = await readFile(filePath, "utf-8");
          const record: ProjectRecord = JSON.parse(raw);
          if (record.id === projectId) {
            return this.toProject(record);
          }
        } catch {
          // Skip malformed project directories
        }
      }
    }

    return null;
  }

  async findAllByTeamId(teamId: TeamId): Promise<Project[]> {
    const teamDir = await this.findTeamDir(teamId);
    if (!teamDir) {
      return [];
    }

    const projectDirs = await this.listProjectDirs(teamDir);
    const projects: Project[] = [];

    for (const projectDir of projectDirs) {
      try {
        const filePath = path.join(
          this.teamsBasePath,
          teamDir,
          "projects",
          projectDir,
          "project.json",
        );
        const raw = await readFile(filePath, "utf-8");
        const record: ProjectRecord = JSON.parse(raw);
        projects.push(this.toProject(record));
      } catch {
        // Skip malformed project directories
      }
    }

    return projects;
  }

  private async findTeamDir(teamId: TeamId): Promise<string | null> {
    const teamDirs = await this.listTeamDirs();

    for (const dir of teamDirs) {
      try {
        const raw = await readFile(
          path.join(this.teamsBasePath, dir, "team.json"),
          "utf-8",
        );
        const meta: TeamMeta = JSON.parse(raw);
        if (meta.id === teamId) {
          return dir;
        }
      } catch {
        // Skip directories without valid team.json
      }
    }

    return null;
  }

  private async listTeamDirs(): Promise<string[]> {
    try {
      const dirents = await readdir(this.teamsBasePath, { withFileTypes: true });
      return dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return [];
    }
  }

  private async listProjectDirs(teamDir: string): Promise<string[]> {
    try {
      const projectsPath = path.join(this.teamsBasePath, teamDir, "projects");
      const dirents = await readdir(projectsPath, { withFileTypes: true });
      return dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return [];
    }
  }

  private toProject(record: ProjectRecord): Project {
    return new Project(
      record.id,
      record.teamId,
      record.workflowId,
      record.name,
      record.path,
      new Date(record.createdAt),
      new Date(record.updatedAt),
    );
  }
}
