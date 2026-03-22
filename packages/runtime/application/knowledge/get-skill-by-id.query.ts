import type { SkillId } from "../../domain/model/skill";
import type { SkillsRepository } from "../../domain/ports/skills.repository";

export class GetSkillByIdQuery {
  constructor(public readonly skillId: SkillId) {}
}

export class GetSkillByIdQueryHandler {
  constructor(private readonly skillRepository: SkillsRepository) {}

  async execute(query: GetSkillByIdQuery) {
    const skill = await this.skillRepository.findById(query.skillId);

    if (skill === null) {
      throw new Error("Skill not found");
    }

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      content: skill.skillContent,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    };
  }
}
