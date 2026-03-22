import { AgentStep } from "../../domain/model/steps";
import { WorkspaceId } from "../../domain/model/workspace";
import { StepsRepository } from "../../domain/ports/steps.repository";

export class GetStepsLibraryQuery {
  constructor(public readonly workspaceId: WorkspaceId) {}
}

export class GetStepsLibraryQueryHandler {
  constructor(private readonly stepsRepository: StepsRepository) {}

  async execute(query: GetStepsLibraryQuery) {
    const steps = await this.stepsRepository.getLibrary();

    return steps.map((step) => {
      if (step instanceof AgentStep) {
        return {
          id: step.id,
          name: step.name,
          description: step.description,
          agentId: step.agentId,
        };
      }

      // HumanStep
      return {
        id: step.id,
        name: step.name,
        description: step.description,
        transports: step.transports,
      };
    });
  }
}
