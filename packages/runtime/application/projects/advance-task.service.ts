import path from "node:path";
import { AutomationStep } from "../../domain/model/steps.js";
import { TaskCurrentStep, type TaskId } from "../../domain/model/task.js";
import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";
import type { StepExecutor } from "../../domain/ports/step-executor.port.js";
import type { TasksRepository } from "../../domain/ports/tasks.repository.js";

export class AdvanceTaskService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly stepExecutor: StepExecutor,
    private readonly workspacePath: string,
  ) {}

  async advanceAfterStepCompletion(taskId: TaskId): Promise<void> {
    const task = await this.tasksRepository.findById(taskId);
    if (!task) throw new Error("Task not found");

    const project = await this.projectsRepository.findById(task.projectId);
    if (!project) throw new Error("Project not found");

    const workflow = project.workflow;
    const currentIndex = workflow.steps.findIndex((s) => s.id === task.currentStep?.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= workflow.steps.length) {
      task.complete();
      await this.tasksRepository.save(task);
      return;
    }

    const nextStep = workflow.steps[nextIndex];
    task.moveToStep(new TaskCurrentStep(nextStep.id));
    await this.tasksRepository.save(task);

    if (nextStep instanceof AutomationStep) {
      await this.executeAutomationStep(taskId, nextStep);
    }
    // AgentStep auto-execution: future scope (hook on agent session completion)
    // HumanStep: stop here, human needs to act (drag the card)
  }

  async executeAutomationStep(taskId: TaskId, step: AutomationStep): Promise<void> {
    const task = await this.tasksRepository.findById(taskId);
    if (!task) throw new Error("Task not found");

    const project = await this.projectsRepository.findById(task.projectId);
    if (!project) throw new Error("Project not found");

    task.markStepRunning();
    await this.tasksRepository.save(task);

    const hisseBase = path.join(this.workspacePath, ".hisse");
    const projectDir = await this.resolveProjectDir(project.id);
    const codePath = path.resolve(hisseBase, step.codePath);

    const result = await this.stepExecutor.execute({
      codePath,
      task: { id: task.id, name: task.name, description: task.description, projectId: task.projectId },
      step: { id: step.id, name: step.name, description: step.description },
      paths: {
        workspace: this.workspacePath,
        project: projectDir,
        tasks: path.join(projectDir, "tasks"),
      },
    });

    // Re-fetch task to get fresh state after executor may have taken time
    const freshTask = await this.tasksRepository.findById(taskId);
    if (!freshTask) throw new Error("Task not found after execution");

    switch (result.outcome) {
      case "completed":
        freshTask.markStepCompleted();
        await this.tasksRepository.save(freshTask);
        await this.advanceAfterStepCompletion(taskId);
        break;

      case "failed":
        freshTask.markStepFailed(result.failureReason ?? "Unknown error");
        await this.tasksRepository.save(freshTask);
        break;

      case "waiting_for_input":
        if (result.inputRequest) {
          freshTask.markStepWaitingForInput(result.inputRequest);
        } else {
          freshTask.markStepFailed("Step requested input but provided no input request schema");
        }
        await this.tasksRepository.save(freshTask);
        break;

      case "move_to_previous": {
        const currentIndex = project.workflow.steps.findIndex((s) => s.id === step.id);
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          const prevStep = project.workflow.steps[prevIndex];
          freshTask.moveToStep(new TaskCurrentStep(prevStep.id));
          // TODO: store annotation on the task for the previous step's agent/human to see
        } else {
          freshTask.markStepFailed("Cannot move to previous step: already at first step");
        }
        await this.tasksRepository.save(freshTask);
        break;
      }
    }
  }

  private async resolveProjectDir(projectId: string): Promise<string> {
    const project = await this.projectsRepository.findById(projectId);
    if (!project) throw new Error("Project not found");

    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return path.join(this.workspacePath, ".hisse", "projects", slug);
  }
}
