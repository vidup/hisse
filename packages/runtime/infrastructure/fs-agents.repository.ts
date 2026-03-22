import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Agent, AgentId } from "../domain/model/agent.js";
import { WorkspaceId } from "../domain/model/workspace.js";
import type { AgentsRepository } from "../domain/ports/agents.repository.js";

interface AgentMeta {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  provider: string;
  model: string;
  tools: string[];
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class FsAgentsRepository implements AgentsRepository {
  private cache: Map<AgentId, Agent> | null = null;

  constructor(private readonly basePath: string) {}

  async preload(): Promise<void> {
    await this.ensureLoaded();
  }

  async save(agent: Agent): Promise<void> {
    const slug = slugify(agent.name);
    const dir = path.join(this.basePath, slug);
    await mkdir(dir, { recursive: true });

    const meta: AgentMeta = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      tools: agent.tools,
      skills: agent.skills,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };

    await writeFile(path.join(dir, "agent.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");

    // Update cache
    if (this.cache) {
      this.cache.set(agent.id, agent);
    }
  }

  async findById(agentId: AgentId): Promise<Agent> {
    await this.ensureLoaded();
    const agent = this.cache!.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  async finAllByWorkspaceId(_workspaceId: WorkspaceId): Promise<Agent[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values());
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache !== null) return;

    this.cache = new Map();

    let entries: string[];
    try {
      const dirents = await readdir(this.basePath, { withFileTypes: true });
      entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return; // Directory doesn't exist yet
    }

    for (const entry of entries) {
      const dir = path.join(this.basePath, entry);
      try {
        const metaRaw = await readFile(path.join(dir, "agent.json"), "utf-8");
        const meta: AgentMeta = JSON.parse(metaRaw);

        const agent = new Agent(
          meta.id,
          meta.name,
          meta.description,
          new Date(meta.createdAt),
          new Date(meta.updatedAt),
          meta.systemPrompt,
          meta.provider,
          meta.model,
          meta.tools,
          meta.skills,
        );
        this.cache.set(agent.id, agent);
      } catch {
        // Skip malformed agent directories
      }
    }
  }
}
