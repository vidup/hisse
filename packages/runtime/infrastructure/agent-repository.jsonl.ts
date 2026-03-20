import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

import { AgentDefinition } from "../domain/model/agent-definition";
import type { AgentRepository } from "../domain/ports/agent.repository";

type AgentDefinitionRecord = AgentDefinition["data"];

export class JsonlAgentRepository implements AgentRepository {
  constructor(private readonly filePath: string) {}

  async findAll(): Promise<AgentDefinition[]> {
    const records = await this.loadRecords();
    return records.map((record) => new AgentDefinition(record));
  }

  async findById(id: string): Promise<AgentDefinition> {
    const records = await this.loadRecords();
    const record = records.find((item) => item.id === id);

    if (!record) {
      throw new Error(`Agent not found: ${id}`);
    }

    return new AgentDefinition(record);
  }

  async save(agent: AgentDefinition): Promise<void> {
    const records = await this.loadRecords();
    const alreadyExists = records.some((item) => item.id === agent.data.id);

    if (alreadyExists) {
      throw new Error(`Agent already exists: ${agent.data.id}`);
    }

    await this.ensureParentDir();
    await appendFile(this.filePath, `${JSON.stringify(agent.data)}\n`, "utf8");
  }

  async update(agent: AgentDefinition): Promise<void> {
    const records = await this.loadRecords();
    const index = records.findIndex((item) => item.id === agent.data.id);

    if (index === -1) {
      throw new Error(`Agent not found: ${agent.data.id}`);
    }

    records[index] = agent.data;

    await this.ensureParentDir();
    const content = records.map((record) => JSON.stringify(record)).join("\n");
    await writeFile(this.filePath, content.length > 0 ? `${content}\n` : "", "utf8");
  }

  private async loadRecords(): Promise<AgentDefinitionRecord[]> {
    try {
      const content = await readFile(this.filePath, "utf8");

      return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => this.parseRecord(line));
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  private parseRecord(line: string): AgentDefinitionRecord {
    const parsed = JSON.parse(line) as Partial<AgentDefinitionRecord>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.systemPrompt !== "string" ||
      typeof parsed.model !== "string" ||
      !isProvider(parsed.provider)
    ) {
      throw new Error(`Invalid agent record in ${this.filePath}`);
    }

    return {
      id: parsed.id,
      name: parsed.name,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      systemPrompt: parsed.systemPrompt,
      model: parsed.model,
      provider: parsed.provider,
    };
  }

  private async ensureParentDir(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
  }
}

function isProvider(value: unknown): value is AgentDefinitionRecord["provider"] {
  return value === "anthropic" || value === "openai" || value === "google" || value === "custom";
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code === "ENOENT"
  );
}
