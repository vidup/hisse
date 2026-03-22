import { Skill, SkillId } from "../model/skill";
import { WorkspaceId } from "../model/workspace";

export interface SkillsRepository {
  save(skill: Skill): Promise<void>;
  findById(skillId: SkillId): Promise<Skill | null>;
  findByIds(skillIds: SkillId[]): Record<SkillId, Skill | null>;
  findAllByWorkspaceId(workspaceId: WorkspaceId): Promise<Skill[]>;
}
