import { Team } from "../../domain/model/team";
import type { TeamsRepository } from "../../domain/ports/teams.repository";

export class CreateTeamCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly folderPath: string,
  ) { }
}

export class CreateTeamCommandHandler {
  constructor(private readonly teamRepository: TeamsRepository) { }

  async execute(command: CreateTeamCommand) {
    const team = Team.create({ name: command.name, description: command.description, folderPath: command.folderPath });
    await this.teamRepository.save(team);
  }
}
