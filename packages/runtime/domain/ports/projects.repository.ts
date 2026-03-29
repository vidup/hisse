import { Project, ProjectId } from "../model/project";

export interface ProjectsRepository {
  save(project: Project): Promise<void>;
  findById(projectId: ProjectId): Promise<Project | null>;
  findAll(): Promise<Project[]>;
}
