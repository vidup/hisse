import { Workflow } from "../../domain/model/workflow";
import type { WorkflowsRepository } from "../../domain/ports/workflows.repository";

export class CreateWorkflowCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
  ) {}
}

export class CreateWorkflowCommandHandler {
  constructor(private readonly workflowRepository: WorkflowsRepository) {}

  async execute(command: CreateWorkflowCommand) {
    const workflow = Workflow.create(command);
    await this.workflowRepository.save(workflow);
  }
}
