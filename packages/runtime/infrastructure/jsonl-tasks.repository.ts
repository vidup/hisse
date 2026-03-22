import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Task, TaskId, TaskStatus } from "../domain/model/task.js";
import { ProjectId } from "../domain/model/project.js";
import type { TasksRepository } from "../domain/ports/tasks.repository.js";

interface TaskRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  projectId: string;
  stepId: string | null;
}

export class JsonlTasksRepository implements TasksRepository {
  private cache: Map<TaskId, Task> | null = null;

  constructor(private readonly filePath: string) {}

  async save(task: Task): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(task.id, task);
    await this.persist();
  }

  async findById(taskId: TaskId): Promise<Task | null> {
    await this.ensureLoaded();
    return this.cache!.get(taskId) ?? null;
  }

  async findAllByProjectId(projectId: ProjectId): Promise<Task[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values()).filter(
      (task) => task.projectId === projectId,
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
      const record: TaskRecord = JSON.parse(line);
      const task = new Task(
        record.id,
        record.name,
        record.description,
        new Date(record.createdAt),
        new Date(record.updatedAt),
        record.status as TaskStatus,
        record.projectId,
        record.stepId,
      );
      this.cache.set(task.id, task);
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const task of this.cache!.values()) {
      const record: TaskRecord = {
        id: task.id,
        name: task.name,
        description: task.description,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        status: task.status,
        projectId: task.projectId,
        stepId: task.stepId,
      };
      lines.push(JSON.stringify(record));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
