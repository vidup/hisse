import { Project, ProjectId } from "../model/project";
import { ProjectV2 } from "../model/project-v2";

export interface ProjectsRepository {
  save(project: Project): Promise<void>;
  findById(projectId: ProjectId): Promise<Project | null>;
  findAll(): Promise<Project[]>;
}

export interface ProjectsV2Repository {
  save(project: ProjectV2): Promise<void>;
  findById(projectId: ProjectId): Promise<ProjectV2 | null>;
  findAll(): Promise<ProjectV2[]>;
}
