import type { ProjectId } from "../model/project";
import type { Task, TaskId } from "../model/task";
import type { Task as TaskV2, TaskExecution } from "../model/project-v2";

export interface TasksRepository {
  save(task: Task): Promise<void>;
  findById(taskId: TaskId): Promise<Task | null>;
  findAllByProjectId(projectId: ProjectId): Promise<Task[]>;
}

export interface TasksV2Repository {
  save(task: TaskV2): Promise<void>;
  findById(taskId: TaskId): Promise<TaskV2 | null>;
  findAllByProjectId(projectId: ProjectId): Promise<TaskV2[]>;
}
