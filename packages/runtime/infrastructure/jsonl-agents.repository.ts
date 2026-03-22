import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Agent, AgentId } from "../domain/model/agent.js";
import { WorkspaceId } from "../domain/model/workspace.js";
import type { AgentsRepository } from "../domain/ports/agents.repository.js";

interface AgentRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  systemPrompt: string;
  provider: string;
  model: string;
  tools: string[];
  skills: string[];
}

export class JsonlAgentsRepository implements AgentsRepository {
  private cache: Map<AgentId, Agent> | null = null;

  constructor(private readonly filePath: string) {}

  async finAllByWorkspaceId(_workspaceId: WorkspaceId): Promise<Agent[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values());
  }

  async findById(agentId: AgentId): Promise<Agent> {
    await this.ensureLoaded();
    const agent = this.cache!.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  async save(agent: Agent): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(agent.id, agent);
    await this.persist();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache !== null) return;

    this.cache = new Map();

    let content: string;
    try {
      content = await readFile(this.filePath, "utf-8");
    } catch {
      return;
    }

    const lines = content.split("\n").filter((line) => line.trim() !== "");
    for (const line of lines) {
      const record: AgentRecord = JSON.parse(line);
      const agent = new Agent(
        record.id,
        record.name,
        record.description,
        new Date(record.createdAt),
        new Date(record.updatedAt),
        record.systemPrompt,
        record.provider,
        record.model,
        record.tools,
        record.skills,
      );
      this.cache.set(agent.id, agent);
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const agent of this.cache!.values()) {
      const record: AgentRecord = {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        systemPrompt: agent.systemPrompt,
        provider: agent.provider,
        model: agent.model,
        tools: [...agent.tools],
        skills: [...agent.skills],
      };
      lines.push(JSON.stringify(record));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
