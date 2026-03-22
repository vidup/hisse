import { WorkspaceId } from "../../domain/model/workspace";
import { SkillsRepository } from "../../domain/ports/skills.repository";

export class GetSkillsQuery {
  constructor(public readonly workspaceId: WorkspaceId) {}
}

export class GetSkillsQueryHandler {
  constructor(private readonly skillRepository: SkillsRepository) {}

  async execute(query: GetSkillsQuery) {
    const skills = await this.skillRepository.findAllByWorkspaceId(query.workspaceId);
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      content: skill.skillContent,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    }));
  }
}
