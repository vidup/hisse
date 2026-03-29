import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import { AgentStep, HumanStep, type Transport } from "../../domain/model/steps.js";
import type { ProjectsRepository } from "../../domain/ports/projects.repository.js";

type UpdateProjectWorkflowStepInput =
  | {
      kind: "agent";
      name: string;
      description?: string;
      agentId: string;
    }
  | {
      kind: "human";
      name: string;
      description?: string;
      transports: Transport[];
    };

export class UpdateProjectWorkflowCommand {
  constructor(
    public readonly projectId: string,
    public readonly steps: UpdateProjectWorkflowStepInput[],
  ) {}
}

export class UpdateProjectWorkflowCommandHandler {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly agentsRepository: AgentsRepository,
  ) {}

  async execute(command: UpdateProjectWorkflowCommand) {
    const project = await this.projectsRepository.findById(command.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const steps = await Promise.all(command.steps.map((step) => this.createProjectStep(step)));
    project.updateWorkflow(steps);
    await this.projectsRepository.save(project);
  }

  private async createProjectStep(step: UpdateProjectWorkflowStepInput) {
    const stepName = step.name.trim();
    if (stepName.length === 0) {
      throw new Error("Step name is required");
    }

    if (step.kind === "agent") {
      await this.agentsRepository.findById(step.agentId);
      return AgentStep.create({
        name: stepName,
        description: step.description?.trim() ?? "",
        agentId: step.agentId,
      });
    }

    if (step.transports.length === 0) {
      throw new Error("Human step must define at least one transport");
    }

    return HumanStep.create({
      name: stepName,
      description: step.description?.trim() ?? "",
      transports: step.transports.map((transport) => ({
        ...transport,
        configuration: { ...transport.configuration },
      })),
    });
  }
}
