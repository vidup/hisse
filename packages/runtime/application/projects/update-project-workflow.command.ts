import { mkdir, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import path from "node:path";
import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import { AgentStep, AutomationStep, HumanStep, type Transport } from "../../domain/model/steps.js";
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
    }
  | {
      kind: "automation";
      name: string;
      description?: string;
    };

const AUTOMATION_STEP_SCAFFOLD = `import type { StepExecutionContext } from "../../../types/step-execution-context"

export default async function(ctx: StepExecutionContext) {
  // Your automation code here.
  // ctx.paths.workspace, ctx.paths.project, ctx.paths.tasks
  // ctx.readFile(), ctx.exec(), ctx.fileExists(), ctx.listFiles()
  // ctx.addFileToTask(), ctx.addFileToProject()
  //
  // Call exactly one: ctx.complete(), ctx.fail(reason),
  // ctx.moveToPreviousStep(annotation), ctx.waitForInput(request)

  ctx.complete()
}
`;

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
    private readonly projectsBasePath: string,
  ) {}

  async execute(command: UpdateProjectWorkflowCommand) {
    const project = await this.projectsRepository.findById(command.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const projectSlug = slugify(project.name);
    const steps = await Promise.all(
      command.steps.map((step) => this.createProjectStep(step, projectSlug)),
    );
    project.updateWorkflow(steps);
    await this.projectsRepository.save(project);
  }

  private async createProjectStep(step: UpdateProjectWorkflowStepInput, projectSlug: string) {
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

    if (step.kind === "automation") {
      const stepSlug = slugify(stepName);
      const codePath = `projects/${projectSlug}/automation-steps/${stepSlug}.ts`;
      const absolutePath = path.join(this.projectsBasePath, projectSlug, "automation-steps", `${stepSlug}.ts`);

      await this.scaffoldAutomationStepIfNeeded(absolutePath);

      return AutomationStep.create({
        name: stepName,
        description: step.description?.trim() ?? "",
        codePath,
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

  private async scaffoldAutomationStepIfNeeded(absolutePath: string): Promise<void> {
    try {
      await access(absolutePath);
      // File already exists, don't overwrite
    } catch {
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, AUTOMATION_STEP_SCAFFOLD, "utf-8");
    }
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
