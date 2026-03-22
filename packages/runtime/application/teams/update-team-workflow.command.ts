import { StepId } from "../../domain/model/steps";
import { TeamId } from "../../domain/model/team";
import { StepsRepository } from "../../domain/ports/steps.repository";
import { TeamsRepository } from "../../domain/ports/teams.repository";

export class UpdateTeamWorkflowCommand {
  constructor(
    public readonly teamId: TeamId,
    public readonly steps: Array<StepId>,
  ) {}
}

export class UpdateTeamWorkflowCommandHandler {
  constructor(
    private readonly teamRepository: TeamsRepository,
    private readonly stepsRepository: StepsRepository,
  ) {}

  async execute(command: UpdateTeamWorkflowCommand) {
    const team = await this.teamRepository.findById(command.teamId);
    if (team === null) {
      throw new Error("Team not found");
    }

    const steps = await this.stepsRepository.findByIds(command.steps);
    if (command.steps.some((stepId) => steps[stepId] === null)) {
      throw new Error("Some steps were not found");
    }

    team.workflow = command.steps;
    await this.teamRepository.save(team);
  }
}
