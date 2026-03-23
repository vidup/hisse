import type { ProjectId } from "../../domain/model/project.js";
import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";
import type { WorkflowsRepository } from "../../domain/ports/workflows.repository.js";
import type { StepsRepository } from "../../domain/ports/steps.repository.js";
import { AgentStep } from "../../domain/model/steps.js";

export class GetProjectByIdQuery {
  constructor(public readonly projectId: ProjectId) {}
}

export class GetProjectByIdQueryHandler {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly stepsRepository: StepsRepository,
  ) {}

  async execute(query: GetProjectByIdQuery) {
    const project = await this.projectsRepository.findById(query.projectId);
    if (!project) throw new Error("Project not found");

    const workflow = await this.workflowsRepository.findById(project.workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const stepsMap = await this.stepsRepository.findByIds(workflow.steps);
    const steps = workflow.steps
      .map((stepId) => stepsMap[stepId])
      .filter((s) => s !== null)
      .map((step) => {
        if (step instanceof AgentStep) {
          return { id: step.id, name: step.name, description: step.description, kind: "agent" as const, agentId: step.agentId };
        }
        return { id: step.id, name: step.name, description: step.description, kind: "human" as const };
      });

    return {
      id: project.id,
      teamId: project.teamId,
      workflowId: project.workflowId,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      workflow: {
        id: workflow.id,
        name: workflow.name,
        steps,
      },
    };
  }
}
