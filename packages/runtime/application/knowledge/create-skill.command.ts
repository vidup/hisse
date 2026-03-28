import { Skill } from "../../domain/model/skill";
import { SkillsRepository } from "../../domain/ports/skills.repository";

export class CreateSkillCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly content: string,
  ) {}
}

export class CreateSkillCommandHandler {
  constructor(private readonly skillRepository: SkillsRepository) {}

  async execute(command: CreateSkillCommand) {
    const skill = Skill.create({
      name: command.name,
      description: command.description,
      content: command.content,
    });

    await this.skillRepository.save(skill);
    return skill.id;
  }
}
