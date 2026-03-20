import { AgentDefinition } from "../model/agent-definition";

export interface AgentRepository {
    findAll(): Promise<AgentDefinition[]>;
    findById(id: string): Promise<AgentDefinition>;
    save(agent: AgentDefinition): Promise<void>;
    update(agent: AgentDefinition): Promise<void>;
}