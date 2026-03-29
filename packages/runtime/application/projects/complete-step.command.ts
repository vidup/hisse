import type { TaskId } from "../../domain/model/task";
import type { TasksRepository } from "../../domain/ports/tasks.repository";
import type { AdvanceTaskService } from "./advance-task.service";

export class CompleteStepCommand {
  constructor(public readonly taskId: TaskId) {}
}

export class CompleteStepCommandHandler {
  constructor(
    private readonly taskRepository: TasksRepository,
    private readonly advanceTaskService: AdvanceTaskService,
  ) {}

  async execute(command: CompleteStepCommand) {
    const task = await this.taskRepository.findById(command.taskId);
    if (task === null) {
      throw new Error("Task not found");
    }

    if (task.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }

    // Mark current step as completed, then advance to next step (or complete task)
    task.markStepCompleted();
    await this.taskRepository.save(task);

    await this.advanceTaskService.advanceAfterStepCompletion(command.taskId);
  }
}
