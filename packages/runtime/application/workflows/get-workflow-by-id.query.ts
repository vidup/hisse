import { HumanStep, Step } from "../../domain/model/steps";
import { WorkflowId } from "../../domain/model/workflow";
import { StepsRepository } from "../../domain/ports/steps.repository";
import { WorkflowsRepository } from "../../domain/ports/workflows.repository";

export class GetWorkflowByIdQuery {
  constructor(public readonly workflowId: WorkflowId) {}
}

export class GetWorkflowByIdQueryHandler {
  constructor(
    private readonly workflowRepository: WorkflowsRepository,
    private readonly stepsRepository: StepsRepository,
  ) {}

  async execute(query: GetWorkflowByIdQuery) {
    const workflow = await this.workflowRepository.findById(query.workflowId);
    if (workflow === null) {
      throw new Error("Workflow not found");
    }

    const steps = await this.stepsRepository.findByIds(workflow.steps);
    const workflowSteps = workflow.steps
      .map((stepId) => steps[stepId])
      .filter((step) => step !== null);
    if (workflowSteps.length !== workflow.steps.length) {
      throw new Error("Some steps were not found");
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      steps: workflowSteps.map(formatStep),
    };
  }
}

function formatStep(step: Step) {
  if (step instanceof HumanStep) {
    return {
      id: step.id,
      name: step.name,
      description: step.description,
      createdAt: step.createdAt.toISOString(),
      transports: step.transports,
    };
  }

  return {
    id: step.id,
    name: step.name,
    description: step.description,
    createdAt: step.createdAt.toISOString(),
    agentId: step.agentId,
  };
}
