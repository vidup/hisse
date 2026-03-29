import type { StepId } from "../../domain/model/steps.js";
import { type TaskId, TaskCurrentStep } from "../../domain/model/task.js";
import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";
import type { TasksRepository } from "../../domain/ports/tasks.repository.js";

export class MoveTaskToStepCommand {
  constructor(
    public readonly taskId: TaskId,
    public readonly stepId: StepId,
  ) {}
}

export class MoveTaskToStepCommandHandler {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async execute(command: MoveTaskToStepCommand) {
    const task = await this.tasksRepository.findById(command.taskId);
    if (!task) throw new Error("Task not found");

    const project = await this.projectsRepository.findById(task.projectId);
    if (!project) throw new Error("Project not found");

    const step = project.workflow.steps.find((candidate) => candidate.id === command.stepId);
    if (!step) throw new Error("Step not found in project workflow");

    task.moveToStep(new TaskCurrentStep(command.stepId));
    await this.tasksRepository.save(task);
  }
}
