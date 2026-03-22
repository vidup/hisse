import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Workflow, WorkflowId } from "../domain/model/workflow.js";
import type { WorkflowsRepository } from "../domain/ports/workflows.repository.js";

interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  steps: string[];
}

export class JsonlWorkflowsRepository implements WorkflowsRepository {
  private cache: Map<WorkflowId, Workflow> | null = null;

  constructor(private readonly filePath: string) {}

  async save(workflow: Workflow): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(workflow.id, workflow);
    await this.persist();
  }

  async findById(workflowId: WorkflowId): Promise<Workflow | null> {
    await this.ensureLoaded();
    return this.cache!.get(workflowId) ?? null;
  }

  async findAll(): Promise<Workflow[]> {
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
      const record: WorkflowRecord = JSON.parse(line);
      const workflow = new Workflow(
        record.id,
        record.name,
        record.description,
        new Date(record.createdAt),
        new Date(record.updatedAt),
        record.steps,
      );
      this.cache.set(workflow.id, workflow);
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const workflow of this.cache!.values()) {
      const record: WorkflowRecord = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        steps: [...workflow.steps],
      };
      lines.push(JSON.stringify(record));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
