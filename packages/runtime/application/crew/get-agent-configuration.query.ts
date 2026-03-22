import type { AgentId } from "../../domain/model/agent";
import type { AgentsRepository } from "../../domain/ports/agents.repository";
import type { SkillsRepository } from "../../domain/ports/skills.repository";

export class GetAgentConfigurationQuery {
  constructor(public readonly agentId: AgentId) {}
}

export class GetAgentConfigurationQueryHandler {
  constructor(
    private readonly agentRepository: AgentsRepository,
    private readonly skillRepository: SkillsRepository,
  ) {}

  async execute(query: GetAgentConfigurationQuery) {
    const agent = await this.agentRepository.findById(query.agentId);

    if (agent === null) {
      throw new Error("Agent not found");
    }

    const skills = await this.skillRepository.findByIds(agent.skills);
    return {
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      tools: agent.tools, // TODO: replace with tools configuration
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
  }
}
