import type { ProjectId } from "../../domain/model/project.js";
import type { StepExecutionState } from "../../domain/model/task.js";
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
      currentStep: task.currentStep
        ? { id: task.currentStep.id, executionState: serializeExecutionState(task.currentStep.executionState) }
        : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  }
}

function serializeExecutionState(state: StepExecutionState) {
  switch (state.status) {
    case "idle":
      return { status: "idle" as const };
    case "running":
      return { status: "running" as const, startedAt: state.startedAt.toISOString() };
    case "completed":
      return {
        status: "completed" as const,
        startedAt: state.startedAt.toISOString(),
        completedAt: state.completedAt.toISOString(),
        durationMs: state.durationMs,
      };
    case "failed":
      return {
        status: "failed" as const,
        startedAt: state.startedAt.toISOString(),
        failedAt: state.failedAt.toISOString(),
        durationMs: state.durationMs,
        reason: state.reason,
      };
    case "waiting_for_input":
      return {
        status: "waiting_for_input" as const,
        startedAt: state.startedAt.toISOString(),
        inputRequest: state.inputRequest,
        inputResponse: state.inputResponse
          ? { answers: state.inputResponse.answers, answeredAt: state.inputResponse.answeredAt.toISOString() }
          : undefined,
      };
  }
}
