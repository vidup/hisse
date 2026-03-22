import type { WorkflowsRepository } from "../../domain/ports/workflows.repository";

export class GetWorkflowsListQuery {
  constructor() {}
}

export class GetWorkflowsListQueryHandler {
  constructor(private readonly workflowRepository: WorkflowsRepository) {}
  async execute(query: GetWorkflowsListQuery) {
    const workflows = await this.workflowRepository.findAll();

    return workflows.map((workflow) => {
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      };
    });
  }
}
