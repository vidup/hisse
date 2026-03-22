import { Team, TeamId } from "../model/team";
import { WorkspaceId } from "../model/workspace";

export interface TeamsRepository {
  save(team: Team): Promise<void>;
  findById(teamId: TeamId): Promise<Team | null>;
  findAllByWorkspaceId(workspaceId: WorkspaceId): Promise<Team[]>;
}
