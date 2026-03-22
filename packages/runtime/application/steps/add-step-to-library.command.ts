import { AgentId } from "../../domain/model/agent";
import { StepsRepository } from "../../domain/ports/steps.repository";
import { AgentStep, HumanStep, Transport } from "../../domain/model/steps";

export class AddStepToLibraryCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly parameters:
      | { kind: "agent"; agentId: AgentId }
      | { kind: "human"; transports: Array<Transport> },
  ) {}
}

export class AddStepToLibraryCommandHandler {
  constructor(private readonly stepsRepository: StepsRepository) {}

  async execute(command: AddStepToLibraryCommand) {
    switch (command.parameters.kind) {
      case "agent": {
        const step = AgentStep.create({
          name: command.name,
          description: command.description,
          agentId: command.parameters.agentId,
        });
        await this.stepsRepository.save(step);
        return;
      }
      case "human": {
        const step = HumanStep.create({
          name: command.name,
          description: command.description,
          transports: command.parameters.transports,
        });
        await this.stepsRepository.save(step);
        return;
      }
    }
  }
}
