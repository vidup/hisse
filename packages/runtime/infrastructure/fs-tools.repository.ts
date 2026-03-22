import { readdir } from "node:fs/promises";
import path from "node:path";
import { Tool } from "../domain/model/tools.js";
import type { ToolsRepository } from "../domain/ports/tools.repository.js";

export class FsToolsRepository implements ToolsRepository {
  constructor(private readonly basePath: string) {}

  async findAll(): Promise<Tool[]> {
    let entries: string[];
    try {
      const dirents = await readdir(this.basePath, { withFileTypes: true });
      entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return [];
    }

    return entries.map(
      (name) => new Tool(name, path.join(this.basePath, name)),
    );
  }

  async findByName(name: string): Promise<Tool | null> {
    const all = await this.findAll();
    return all.find((t) => t.name === name) ?? null;
  }
}
