import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Skill, SkillId } from "../domain/model/skill.js";
import { WorkspaceId } from "../domain/model/workspace.js";
import type { SkillsRepository } from "../domain/ports/skills.repository.js";

interface SkillRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  skillContent: string;
}

export class JsonlSkillsRepository implements SkillsRepository {
  private cache: Map<SkillId, Skill> | null = null;

  constructor(private readonly filePath: string) {}

  /**
   * Must be called before using sync methods like `findByIds`.
   */
  async preload(): Promise<void> {
    await this.ensureLoaded();
  }

  async save(skill: Skill): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(skill.id, skill);
    await this.persist();
  }

  async findById(skillId: SkillId): Promise<Skill | null> {
    await this.ensureLoaded();
    return this.cache!.get(skillId) ?? null;
  }

  findByIds(skillIds: SkillId[]): Record<SkillId, Skill | null> {
    if (this.cache === null) {
      throw new Error(
        "Cache not loaded. Call preload() before using findByIds.",
      );
    }
    const result: Record<SkillId, Skill | null> = {};
    for (const id of skillIds) {
      result[id] = this.cache.get(id) ?? null;
    }
    return result;
  }

  async findAllByWorkspaceId(_workspaceId: WorkspaceId): Promise<Skill[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values());
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
      const record: SkillRecord = JSON.parse(line);
      const skill = new Skill(
        record.id,
        record.name,
        record.description,
        new Date(record.createdAt),
        new Date(record.updatedAt),
        record.skillContent,
      );
      this.cache.set(skill.id, skill);
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const skill of this.cache!.values()) {
      const record: SkillRecord = {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        createdAt: skill.createdAt.toISOString(),
        updatedAt: skill.updatedAt.toISOString(),
        skillContent: skill.skillContent,
      };
      lines.push(JSON.stringify(record));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
