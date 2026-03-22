import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Task, TaskId, TaskStatus } from "../domain/model/task.js";
import { ProjectId } from "../domain/model/project.js";
import type { TasksRepository } from "../domain/ports/tasks.repository.js";

interface TaskRecord {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  stepId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMeta {
  id: string;
}

export class FsTasksRepository implements TasksRepository {
  constructor(private readonly teamsBasePath: string) {}

  async save(task: Task): Promise<void> {
    const projectPath = await this.findProjectDir(task.projectId);
    if (!projectPath) {
      throw new Error(`Project directory not found for projectId: ${task.projectId}`);
    }

    const tasksDir = path.join(projectPath, "tasks");
    await mkdir(tasksDir, { recursive: true });

    const record: TaskRecord = {
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      projectId: task.projectId,
      stepId: task.stepId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };

    await writeFile(
      path.join(tasksDir, `${task.id}.json`),
      JSON.stringify(record, null, 2) + "\n",
      "utf-8",
    );
  }

  async findById(taskId: TaskId): Promise<Task | null> {
    const teamDirs = await this.listTeamDirs();

    for (const teamDir of teamDirs) {
      const projectDirs = await this.listProjectDirs(teamDir);
      for (const projectDir of projectDirs) {
        const taskFiles = await this.listTaskFiles(teamDir, projectDir);
        for (const taskFile of taskFiles) {
          try {
            const filePath = path.join(
              this.teamsBasePath,
              teamDir,
              "projects",
              projectDir,
              "tasks",
              taskFile,
            );
            const raw = await readFile(filePath, "utf-8");
            const record: TaskRecord = JSON.parse(raw);
            if (record.id === taskId) {
              return this.toTask(record);
            }
          } catch {
            // Skip malformed task files
          }
        }
      }
    }

    return null;
  }

  async findAllByProjectId(projectId: ProjectId): Promise<Task[]> {
    const projectPath = await this.findProjectDir(projectId);
    if (!projectPath) {
      return [];
    }

    const tasks: Task[] = [];

    try {
      const tasksPath = path.join(projectPath, "tasks");
      const dirents = await readdir(tasksPath, { withFileTypes: true });
      const files = dirents.filter((d) => d.isFile() && d.name.endsWith(".json")).map((d) => d.name);

      for (const file of files) {
        try {
          const raw = await readFile(path.join(tasksPath, file), "utf-8");
          const record: TaskRecord = JSON.parse(raw);
          tasks.push(this.toTask(record));
        } catch {
          // Skip malformed task files
        }
      }
    } catch {
      // tasks/ directory doesn't exist yet
    }

    return tasks;
  }

  private async findProjectDir(projectId: ProjectId): Promise<string | null> {
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
          const meta: ProjectMeta = JSON.parse(raw);
          if (meta.id === projectId) {
            return path.join(this.teamsBasePath, teamDir, "projects", projectDir);
          }
        } catch {
          // Skip directories without valid project.json
        }
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

  private async listTaskFiles(teamDir: string, projectDir: string): Promise<string[]> {
    try {
      const tasksPath = path.join(
        this.teamsBasePath,
        teamDir,
        "projects",
        projectDir,
        "tasks",
      );
      const dirents = await readdir(tasksPath, { withFileTypes: true });
      return dirents.filter((d) => d.isFile() && d.name.endsWith(".json")).map((d) => d.name);
    } catch {
      return [];
    }
  }

  private toTask(record: TaskRecord): Task {
    return new Task(
      record.id,
      record.name,
      record.description,
      new Date(record.createdAt),
      new Date(record.updatedAt),
      record.status,
      record.projectId,
      record.stepId,
    );
  }
}
