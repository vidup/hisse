import type { WorkspaceId } from "../../domain/model/workspace";
import type { TeamsRepository } from "../../domain/ports/teams.repository";

export class GetTeamsListQuery {
  constructor(public readonly workspaceId: WorkspaceId) {}
}

export class GetTeamsListQueryHandler {
  constructor(private readonly teamRepository: TeamsRepository) {}

  async execute(query: GetTeamsListQuery) {
    const teams = await this.teamRepository.findAllByWorkspaceId(query.workspaceId);
    return teams.map((team) => {
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      };
    });
  }
}
