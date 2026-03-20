import type { AgentRepository } from "../../../domain/ports/agent.repository";
import type { AgentDefinition } from "../../../domain/model/agent-definition";

export class GetAgentsQuery {
    constructor(
        public readonly id?: string,
    ) { }
}

export class GetAgentsQueryHandler {
    constructor(
        private readonly agentRepository: AgentRepository,
    ) { }

    async execute(query: GetAgentsQuery): Promise<AgentDefinition[]> {
        return this.agentRepository.findAll();
    }
}