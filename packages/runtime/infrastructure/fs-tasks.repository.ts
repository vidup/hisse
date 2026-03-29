import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProjectId } from "../domain/model/project.js";
import { Task, TaskCurrentStep, TaskId, TaskStatus } from "../domain/model/task.js";
import type { TasksRepository } from "../domain/ports/tasks.repository.js";

interface TaskRecord {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  currentStep: { id: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMeta {
  id: string;
}

export class FsTasksRepository implements TasksRepository {
  constructor(private readonly projectsBasePath: string) {}

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
      currentStep: task.currentStep ? { id: task.currentStep.id } : null,
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
    const projectDirs = await this.listProjectDirs();

    for (const projectDir of projectDirs) {
      const taskFiles = await this.listTaskFiles(projectDir);
      for (const taskFile of taskFiles) {
        try {
          const raw = await readFile(
            path.join(this.projectsBasePath, projectDir, "tasks", taskFile),
            "utf-8",
          );
          const record: TaskRecord = JSON.parse(raw);
          if (record.id === taskId) {
            return this.toTask(record);
          }
        } catch {
          // Skip malformed task files
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
      const files = dirents.filter((dirent) => dirent.isFile() && dirent.name.endsWith(".json"));

      for (const file of files) {
        try {
          const raw = await readFile(path.join(tasksPath, file.name), "utf-8");
          const record: TaskRecord = JSON.parse(raw);
          tasks.push(this.toTask(record));
        } catch {
          // Skip malformed task files
        }
      }
    } catch {
      // tasks/ directory does not exist yet
    }

    return tasks;
  }

  private async findProjectDir(projectId: ProjectId): Promise<string | null> {
    const projectDirs = await this.listProjectDirs();

    for (const projectDir of projectDirs) {
      try {
        const raw = await readFile(path.join(this.projectsBasePath, projectDir, "project.json"), "utf-8");
        const meta: ProjectMeta = JSON.parse(raw);
        if (meta.id === projectId) {
          return path.join(this.projectsBasePath, projectDir);
        }
      } catch {
        // Skip directories without a valid project.json
      }
    }

    return null;
  }

  private async listProjectDirs(): Promise<string[]> {
    try {
      const dirents = await readdir(this.projectsBasePath, { withFileTypes: true });
      return dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
    } catch {
      return [];
    }
  }

  private async listTaskFiles(projectDir: string): Promise<string[]> {
    try {
      const tasksPath = path.join(this.projectsBasePath, projectDir, "tasks");
      const dirents = await readdir(tasksPath, { withFileTypes: true });
      return dirents.filter((dirent) => dirent.isFile() && dirent.name.endsWith(".json")).map((dirent) => dirent.name);
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
      record.currentStep ? new TaskCurrentStep(record.currentStep.id) : null,
    );
  }
}
