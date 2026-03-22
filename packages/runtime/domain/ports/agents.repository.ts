import { Agent, AgentId } from "../model/agent";
import { WorkspaceId } from "../model/workspace";

export interface AgentsRepository {
  finAllByWorkspaceId(workspaceId: WorkspaceId): Promise<Agent[]>;
  findById(agentId: AgentId): Promise<Agent>;
  save(agent: Agent): Promise<void>;
}
