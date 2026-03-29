import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";

export class GetProjectsListQuery {}

export class GetProjectsListQueryHandler {
  constructor(private readonly projectRepository: ProjectsRepository) {}

  async execute(_query: GetProjectsListQuery) {
    const projects = await this.projectRepository.findAll();
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      workflow: {
        id: project.workflow.id,
        stepCount: project.workflow.steps.length,
      },
    }));
  }
}
