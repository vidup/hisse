import type { SkillId } from "../../domain/model/skill";
import { SkillsRepository } from "../../domain/ports/skills.repository";

export class UpdateSkillCommand {
  constructor(
    public readonly skillId: SkillId,
    public readonly name: string,
    public readonly description: string,
    public readonly content: string,
  ) {}
}

export class UpdateSkillCommandHandler {
  constructor(private readonly skillRepository: SkillsRepository) {}

  async execute(command: UpdateSkillCommand) {
    const skill = await this.skillRepository.findById(command.skillId);
    if (skill === null) {
      throw new Error("Skill not found");
    }

    skill.skillContent = command.content;
    skill.description = command.description;
    skill.name = command.name;

    await this.skillRepository.save(skill);
  }
}
