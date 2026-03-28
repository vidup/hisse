import type { Agent } from "../../domain/model/agent.js";
import type { AgentSkillAccess } from "../../domain/ports/agent-runtime.js";
import type { SkillsRepository } from "../../domain/ports/skills.repository.js";
import { parseSkillInvocations } from "../../domain/services/parse-input.js";

export async function getAgentAvailableSkills(
  agent: Agent,
  skillsRepo: SkillsRepository,
): Promise<AgentSkillAccess[]> {
  const skills = skillsRepo.findByIds(agent.skills);

  return agent.skills
    .map((skillId) => skills[skillId])
    .filter((skill) => skill !== null)
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    }));
}

export function buildSkillInvocationInstruction(
  content: string,
  availableSkills: AgentSkillAccess[],
): string {
  const invokedSkillNames = [...new Set(parseSkillInvocations(content))];
  if (invokedSkillNames.length === 0) {
    return "";
  }

  const availableSkillsByName = new Map(
    availableSkills.map((skill) => [skill.name.toLowerCase(), skill]),
  );

  const resolvedSkills = invokedSkillNames.map((skillName) => {
    const skill = availableSkillsByName.get(skillName.toLowerCase());
    if (!skill) {
      const allowedSkills = availableSkills.map((candidate) => candidate.name).sort();
      const availableLabel =
        allowedSkills.length > 0 ? allowedSkills.join(", ") : "none";
      throw new Error(
        `Skill "${skillName}" is not available for this agent. Available skills: ${availableLabel}.`,
      );
    }
    return skill;
  });

  const orderedNames = resolvedSkills.map((skill) => `"${skill.name}"`).join(", ");
  return [
    "The user explicitly invoked one or more agent skills.",
    `Before answering, call ReadAgentSkill for ${orderedNames}.`,
    "If the skill references supporting files, inspect them with ReadAgentSkillFile before using them.",
    "Do not access .hisse/skills with filesystem tools.",
  ].join("\n");
}
