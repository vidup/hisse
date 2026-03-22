import type { ToolsRepository } from "../../domain/ports/tools.repository.js";

export class GetToolsQuery {}

export class GetToolsQueryHandler {
  constructor(private readonly toolsRepository: ToolsRepository) {}

  async execute(_query: GetToolsQuery) {
    const tools = await this.toolsRepository.findAll();
    return tools.map((tool) => ({
      name: tool.name,
      codePath: tool.codePath,
    }));
  }
}
