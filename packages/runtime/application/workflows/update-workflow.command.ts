import type { StepId } from "../../domain/model/steps";
import type { WorkflowId } from "../../domain/model/workflow";
import type { WorkflowsRepository } from "../../domain/ports/workflows.repository";
import type { StepsRepository } from "../../domain/ports/steps.repository";

export class UpdateWorkflowCommand {
  constructor(
    public readonly workflowId: WorkflowId,
    public readonly steps: StepId[],
  ) {}
}

export class UpdateWorkflowCommandHandler {
  constructor(
    private readonly workflowRepository: WorkflowsRepository,
    private readonly stepsRepository: StepsRepository,
  ) {}

  async execute(command: UpdateWorkflowCommand) {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (workflow === null) {
      throw new Error("Workflow not found");
    }

    const steps = await this.stepsRepository.findByIds(command.steps);
    if (command.steps.some((stepId) => steps[stepId] === null)) {
      throw new Error("Some steps were not found");
    }

    workflow.steps = command.steps;
    await this.workflowRepository.save(workflow);
  }
}
