import type { WorkspaceId } from "../../domain/model/workspace";
import type { TeamsRepository } from "../../domain/ports/teams.repository";

export class GetTeamsListQuery {
  constructor(public readonly workspaceId: WorkspaceId) {}
}

export class GetTeamsListQueryHandler {
  constructor(private readonly teamRepository: TeamsRepository) {}

  async execute(query: GetTeamsListQuery) {
    return await this.teamRepository.findAllByWorkspaceId(query.workspaceId);
  }
}
