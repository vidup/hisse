import { AgentDefinition } from "../../../domain/model/agent-definition";
import { AgentRepository } from "../../../domain/ports/agent.repository";

export class CreateAgentCommand {
    constructor(
        public readonly name: string,
        public readonly systemPrompt: string,
        public readonly model: string = "gpt-4o",
        public readonly provider: "anthropic" | "openai" | "google" | "custom" = "openai",
        public readonly description?: string,
    ) { }
}

export class CreateAgentCommandHandler {
    constructor(
        private readonly agentRepository: AgentRepository,
    ) { }

    async execute(command: CreateAgentCommand): Promise<void> {
        const agent = AgentDefinition.create(command);
        await this.agentRepository.save(agent);
    }
}