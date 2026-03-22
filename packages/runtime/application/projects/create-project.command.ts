import { Project } from "../../domain/model/project";
import { TeamId } from "../../domain/model/team";
import { WorkflowId } from "../../domain/model/workflow";
import { ProjectsRepository } from "../../domain/ports/projects.repository";
import { WorkflowsRepository } from "../../domain/ports/workflows.repository";

export class CreateProjectCommand {
  constructor(
    public readonly name: string,
    public readonly teamId: TeamId,
    public readonly workflowId: WorkflowId,
  ) {}
}

export class CreateProjectCommandHandler {
  constructor(
    private readonly projectRepository: ProjectsRepository,
    private readonly workflowRepository: WorkflowsRepository,
  ) {}

  async execute(command: CreateProjectCommand) {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (workflow === null) {
      throw new Error("Workflow not found");
    }

    const project = Project.create({
      name: command.name,
      teamId: command.teamId,
      workflowId: command.workflowId,
    });
    await this.projectRepository.save(project);
  }
}
