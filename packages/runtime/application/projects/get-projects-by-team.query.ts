import type { TeamId } from "../../domain/model/team.js";
import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";

export class GetProjectsByTeamQuery {
  constructor(public readonly teamId: TeamId) {}
}

export class GetProjectsByTeamQueryHandler {
  constructor(private readonly projectRepository: ProjectsRepository) {}

  async execute(query: GetProjectsByTeamQuery) {
    const projects = await this.projectRepository.findAllByTeamId(query.teamId);
    return projects.map((project) => ({
      id: project.id,
      teamId: project.teamId,
      workflowId: project.workflowId,
      name: project.name,
      path: project.path,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }));
  }
}
