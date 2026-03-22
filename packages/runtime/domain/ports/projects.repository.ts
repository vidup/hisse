import { Project, ProjectId } from "../model/project";
import { TeamId } from "../model/team";

export interface ProjectsRepository {
  save(project: Project): Promise<void>;
  findById(projectId: ProjectId): Promise<Project | null>;
  findAllByTeamId(teamId: TeamId): Promise<Project[]>;
}
