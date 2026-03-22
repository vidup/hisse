import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Workflow, WorkflowId } from "../domain/model/workflow.js";
import type { WorkflowsRepository } from "../domain/ports/workflows.repository.js";

interface WorkflowMeta {
  id: string;
  name: string;
  description: string;
  steps: string[];
  createdAt: string;
  updatedAt: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class FsWorkflowsRepository implements WorkflowsRepository {
  private cache: Map<WorkflowId, Workflow> | null = null;

  constructor(private readonly basePath: string) {}

  async preload(): Promise<void> {
    await this.ensureLoaded();
  }

  async save(workflow: Workflow): Promise<void> {
    const slug = slugify(workflow.name);
    const dir = path.join(this.basePath, slug);
    await mkdir(dir, { recursive: true });

    const meta: WorkflowMeta = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      steps: workflow.steps,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };

    await writeFile(path.join(dir, "workflow.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");

    // Update cache
    if (this.cache) {
      this.cache.set(workflow.id, workflow);
    }
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
        const metaRaw = await readFile(path.join(dir, "workflow.json"), "utf-8");
        const meta: WorkflowMeta = JSON.parse(metaRaw);

        const workflow = new Workflow(
          meta.id,
          meta.name,
          meta.description,
          new Date(meta.createdAt),
          new Date(meta.updatedAt),
          meta.steps,
        );
        this.cache.set(workflow.id, workflow);
      } catch {
        // Skip malformed workflow directories
      }
    }
  }
}
