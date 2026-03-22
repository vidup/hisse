import { Agent } from "../../domain/model/agent";
import { SkillId } from "../../domain/model/skill";
import { ToolId } from "../../domain/model/tools";
import { WorkspaceId } from "../../domain/model/workspace";
import { AgentsRepository } from "../../domain/ports/agents.repository";

export class CreateAgentCommand {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly name: string,
    public readonly description: string,
    public readonly systemPrompt: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly tools: ToolId[],
    public readonly skills: SkillId[],
  ) {}
}

export class CreateAgentCommandHandler {
  constructor(private readonly agentRepository: AgentsRepository) {}

  async execute(command: CreateAgentCommand) {
    const agent = Agent.create({
      name: command.name,
      description: command.description,
      systemPrompt: command.systemPrompt,
      provider: command.provider,
      model: command.model,
      tools: command.tools,
      skills: command.skills,
    });
    await this.agentRepository.save(agent);
  }
}
