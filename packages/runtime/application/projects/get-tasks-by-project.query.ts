import type { ProjectId } from "../../domain/model/project.js";
import type { TasksRepository } from "../../domain/ports/tasks.repository.js";

export class GetTasksByProjectQuery {
  constructor(public readonly projectId: ProjectId) {}
}

export class GetTasksByProjectQueryHandler {
  constructor(private readonly tasksRepository: TasksRepository) {}

  async execute(query: GetTasksByProjectQuery) {
    const tasks = await this.tasksRepository.findAllByProjectId(query.projectId);
    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      projectId: task.projectId,
      currentStep: task.currentStep ? { id: task.currentStep.id, index: task.currentStep.index } : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  }
}
