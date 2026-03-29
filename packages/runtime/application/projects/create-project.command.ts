import { Project } from "../../domain/model/project";
import { ProjectsRepository } from "../../domain/ports/projects.repository";

export class CreateProjectCommand {
  constructor(
    public readonly name: string,
    public readonly description: string = "",
  ) {}
}

export class CreateProjectCommandHandler {
  constructor(private readonly projectRepository: ProjectsRepository) {}

  async execute(command: CreateProjectCommand) {
    const projectName = command.name.trim();

    if (projectName.length === 0) {
      throw new Error("Project name is required");
    }

    const project = Project.create({
      name: projectName,
      description: command.description.trim(),
    });
    await this.projectRepository.save(project);
  }
}
