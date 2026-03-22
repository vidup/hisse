import { Step, StepId } from "../../domain/model/steps";
import { TeamId } from "../../domain/model/team";
import type { TeamsRepository } from "../../domain/ports/teams.repository";

export class GetTeamWorkflowQuery {
  constructor(public readonly teamId: TeamId) {}
}

export class GetTeamWorkflowQueryHandler {
  constructor(private readonly teamRepository: TeamsRepository) {}

  async execute(query: GetTeamWorkflowQuery) {
    const team = await this.teamRepository.findById(query.teamId);
    if (team === null) {
      throw new Error("Team not found");
    }
    return team.workflow;
  }
}

export class GetTeamWorkflowQueryResponse {
  constructor(public readonly steps: Record<StepId, Step>) {}
}
