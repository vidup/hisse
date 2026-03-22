import type { ProjectId } from "../model/project";
import type { Task, TaskId } from "../model/task";

export interface TasksRepository {
    save(task: Task): Promise<void>;
    findById(taskId: TaskId): Promise<Task | null>;
    findAllByProjectId(projectId: ProjectId): Promise<Task[]>;
}