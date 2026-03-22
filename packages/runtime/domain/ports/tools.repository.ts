import type { Tool } from "../model/tools.js";

export interface ToolsRepository {
  findAll(): Promise<Tool[]>;
  findByName(name: string): Promise<Tool | null>;
}
