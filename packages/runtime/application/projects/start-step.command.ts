import { AutomationStep, type StepId } from "../../domain/model/steps";
import { type TaskId, TaskCurrentStep } from "../../domain/model/task";
import type { ProjectsRepository } from "../../domain/ports/projects.repository";
import type { TasksRepository } from "../../domain/ports/tasks.repository";
import type { AdvanceTaskService } from "./advance-task.service";

export class StartStepCommand {
  constructor(
    public readonly taskId: TaskId,
    public readonly stepId: StepId,
  ) {}
}

export class StartStepCommandHandler {
  constructor(
    private readonly taskRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly advanceTaskService: AdvanceTaskService,
  ) {}

  async execute(command: StartStepCommand) {
    const task = await this.taskRepository.findById(command.taskId);
    if (task === null) throw new Error("Task not found");

    const project = await this.projectsRepository.findById(task.projectId);
    if (project === null) throw new Error("Project not found");

    const step = project.workflow.steps.find((candidate) => candidate.id === command.stepId);
    if (step === undefined) throw new Error("Step not found in project workflow");

    task.start(new TaskCurrentStep(command.stepId));
    await this.taskRepository.save(task);

    if (step instanceof AutomationStep) {
      await this.advanceTaskService.executeAutomationStep(command.taskId, step);
    }
  }
}
