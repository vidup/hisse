import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Skill, SkillId } from "../domain/model/skill.js";
import { WorkspaceId } from "../domain/model/workspace.js";
import type { SkillsRepository } from "../domain/ports/skills.repository.js";

interface SkillMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class FsSkillsRepository implements SkillsRepository {
  private cache: Map<SkillId, Skill> | null = null;

  constructor(private readonly basePath: string) {}

  async preload(): Promise<void> {
    await this.ensureLoaded();
  }

  async save(skill: Skill): Promise<void> {
    const slug = slugify(skill.name);
    const dir = path.join(this.basePath, slug);
    await mkdir(dir, { recursive: true });

    const meta: SkillMeta = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    };

    await writeFile(path.join(dir, "skill.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");
    await writeFile(path.join(dir, "SKILL.md"), skill.skillContent, "utf-8");

    // Update cache
    if (this.cache) {
      this.cache.set(skill.id, skill);
    }
  }

  async findById(skillId: SkillId): Promise<Skill | null> {
    await this.ensureLoaded();
    return this.cache!.get(skillId) ?? null;
  }

  findByIds(skillIds: SkillId[]): Record<SkillId, Skill | null> {
    if (this.cache === null) {
      throw new Error("Cache not loaded. Call preload() before using findByIds.");
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
        const metaRaw = await readFile(path.join(dir, "skill.json"), "utf-8");
        const meta: SkillMeta = JSON.parse(metaRaw);

        let content = "";
        try {
          content = await readFile(path.join(dir, "SKILL.md"), "utf-8");
        } catch {
          // No SKILL.md, content stays empty
        }

        const skill = new Skill(
          meta.id,
          meta.name,
          meta.description,
          new Date(meta.createdAt),
          new Date(meta.updatedAt),
          content,
        );
        this.cache.set(skill.id, skill);
      } catch {
        // Skip malformed skill directories
      }
    }
  }
}
