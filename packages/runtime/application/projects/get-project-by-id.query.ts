import type { ProjectId } from "../../domain/model/project.js";
import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";
import { AgentStep } from "../../domain/model/steps.js";

export class GetProjectByIdQuery {
  constructor(public readonly projectId: ProjectId) {}
}

export class GetProjectByIdQueryHandler {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async execute(query: GetProjectByIdQuery) {
    const project = await this.projectsRepository.findById(query.projectId);
    if (!project) throw new Error("Project not found");

    const steps = project.workflow.steps.map((step) => {
      if (step instanceof AgentStep) {
        return { id: step.id, name: step.name, description: step.description, kind: "agent" as const, agentId: step.agentId };
      }
      return { id: step.id, name: step.name, description: step.description, kind: "human" as const };
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      workflow: {
        id: project.workflow.id,
        steps,
      },
    };
  }
}
