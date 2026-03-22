import { WorkspaceId } from "../../domain/model/workspace";
import { AgentsRepository } from "../../domain/ports/agents.repository";
import { SkillsRepository } from "../../domain/ports/skills.repository";

export class GetAgentsQuery {
  constructor(public readonly workspaceId: WorkspaceId) {}
}

export class GetAgentsQueryHandler {
  constructor(
    private readonly agentRepository: AgentsRepository,
    private readonly skillRepository: SkillsRepository,
  ) {}

  async execute(query: GetAgentsQuery) {
    const agents = await this.agentRepository.finAllByWorkspaceId(query.workspaceId);
    const skillIds = agents.flatMap((agent) => agent.skills).map((skillId) => skillId);
    const skills = await this.skillRepository.findByIds(skillIds);

    return agents.map((agent) => {
      return {
        ...agent,
        skills: agent.skills
          .map((skillId) =>
            skills[skillId]
              ? {
                  id: skillId,
                  name: skills[skillId].name,
                }
              : null,
          )
          .filter((skill) => skill !== null),
      };
    });
  }
}
