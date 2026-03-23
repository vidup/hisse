import type { StepId } from "../../domain/model/steps.js";
import { type TaskId, TaskCurrentStep } from "../../domain/model/task.js";
import type { TasksRepository } from "../../domain/ports/tasks.repository.js";
import type { StepsRepository } from "../../domain/ports/steps.repository.js";

export class MoveTaskToStepCommand {
  constructor(
    public readonly taskId: TaskId,
    public readonly stepId: StepId,
    public readonly stepIndex: number,
  ) {}
}

export class MoveTaskToStepCommandHandler {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly stepsRepository: StepsRepository,
  ) {}

  async execute(command: MoveTaskToStepCommand) {
    const task = await this.tasksRepository.findById(command.taskId);
    if (!task) throw new Error("Task not found");

    const step = await this.stepsRepository.findById(command.stepId);
    if (!step) throw new Error("Step not found");

    task.moveToStep(new TaskCurrentStep(command.stepId, command.stepIndex));
    await this.tasksRepository.save(task);
  }
}
