import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProjectId } from "../domain/model/project.js";
import { Task, TaskCurrentStep, TaskId, TaskStatus, type StepExecutionState, type StepInputRequest, type StepInputResponse } from "../domain/model/task.js";
import type { TasksRepository } from "../domain/ports/tasks.repository.js";

interface TaskRecord {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  currentStep: {
    id: string;
    executionState?: SerializedStepExecutionState;
  } | null;
  createdAt: string;
  updatedAt: string;
}

type SerializedStepExecutionState =
  | { status: "idle" }
  | { status: "running"; startedAt: string }
  | { status: "completed"; startedAt: string; completedAt: string; durationMs: number }
  | { status: "failed"; startedAt: string; failedAt: string; durationMs: number; reason: string }
  | { status: "waiting_for_input"; startedAt: string; inputRequest: unknown; inputResponse?: unknown };

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
      currentStep: task.currentStep
        ? { id: task.currentStep.id, executionState: serializeExecutionState(task.currentStep.executionState) }
        : null,
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
      record.currentStep
        ? new TaskCurrentStep(record.currentStep.id, deserializeExecutionState(record.currentStep.executionState))
        : null,
    );
  }
}

function serializeExecutionState(state: StepExecutionState): SerializedStepExecutionState {
  switch (state.status) {
    case "idle":
      return { status: "idle" };
    case "running":
      return { status: "running", startedAt: state.startedAt.toISOString() };
    case "completed":
      return {
        status: "completed",
        startedAt: state.startedAt.toISOString(),
        completedAt: state.completedAt.toISOString(),
        durationMs: state.durationMs,
      };
    case "failed":
      return {
        status: "failed",
        startedAt: state.startedAt.toISOString(),
        failedAt: state.failedAt.toISOString(),
        durationMs: state.durationMs,
        reason: state.reason,
      };
    case "waiting_for_input":
      return {
        status: "waiting_for_input",
        startedAt: state.startedAt.toISOString(),
        inputRequest: state.inputRequest,
        inputResponse: state.inputResponse
          ? { answers: state.inputResponse.answers, answeredAt: state.inputResponse.answeredAt.toISOString() }
          : undefined,
      };
  }
}

function deserializeExecutionState(raw?: SerializedStepExecutionState): StepExecutionState {
  if (!raw) return { status: "idle" };

  switch (raw.status) {
    case "idle":
      return { status: "idle" };
    case "running":
      return { status: "running", startedAt: new Date(raw.startedAt) };
    case "completed":
      return {
        status: "completed",
        startedAt: new Date(raw.startedAt),
        completedAt: new Date(raw.completedAt),
        durationMs: raw.durationMs,
      };
    case "failed":
      return {
        status: "failed",
        startedAt: new Date(raw.startedAt),
        failedAt: new Date(raw.failedAt),
        durationMs: raw.durationMs,
        reason: raw.reason,
      };
    case "waiting_for_input": {
      const inputRequest = raw.inputRequest as StepInputRequest;
      const rawResponse = raw.inputResponse as { answers: unknown[]; answeredAt: string } | undefined;
      return {
        status: "waiting_for_input",
        startedAt: new Date(raw.startedAt),
        inputRequest,
        inputResponse: rawResponse
          ? { answers: rawResponse.answers as StepInputResponse["answers"], answeredAt: new Date(rawResponse.answeredAt) }
          : undefined,
      };
    }
    default:
      return { status: "idle" };
  }
}
