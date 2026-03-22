import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { HumanStep, AgentStep, Step, StepId, Transport } from "../domain/model/steps.js";
import type { StepsRepository } from "../domain/ports/steps.repository.js";

interface AgentStepMeta {
  id: string;
  kind: "agent";
  name: string;
  description: string;
  agentId: string;
  createdAt: string;
}

interface HumanStepMeta {
  id: string;
  kind: "human";
  name: string;
  description: string;
  transports: Array<{ type: string; target: string; configuration: Record<string, any>; authenticated: boolean }>;
  createdAt: string;
}

type StepMeta = AgentStepMeta | HumanStepMeta;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class FsStepsRepository implements StepsRepository {
  private cache: Map<StepId, Step> | null = null;

  constructor(private readonly basePath: string) {}

  async preload(): Promise<void> {
    await this.ensureLoaded();
  }

  async save(step: Step): Promise<void> {
    const slug = slugify(step.name);
    const dir = path.join(this.basePath, slug);
    await mkdir(dir, { recursive: true });

    let meta: StepMeta;

    if (step instanceof AgentStep) {
      meta = {
        id: step.id,
        kind: "agent",
        name: step.name,
        description: step.description,
        agentId: step.agentId,
        createdAt: step.createdAt.toISOString(),
      };
    } else {
      const human = step as HumanStep;
      meta = {
        id: human.id,
        kind: "human",
        name: human.name,
        description: human.description,
        transports: human.transports,
        createdAt: human.createdAt.toISOString(),
      };
    }

    await writeFile(path.join(dir, "step.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");

    // Update cache
    if (this.cache) {
      this.cache.set(step.id, step);
    }
  }

  async findById(stepId: StepId): Promise<Step | null> {
    await this.ensureLoaded();
    return this.cache!.get(stepId) ?? null;
  }

  async findByIds(stepIds: StepId[]): Promise<Record<StepId, Step | null>> {
    await this.ensureLoaded();
    const result: Record<StepId, Step | null> = {};
    for (const id of stepIds) {
      result[id] = this.cache!.get(id) ?? null;
    }
    return result;
  }

  async getLibrary(): Promise<Step[]> {
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
        const metaRaw = await readFile(path.join(dir, "step.json"), "utf-8");
        const meta: StepMeta = JSON.parse(metaRaw);

        let step: Step;
        if (meta.kind === "agent") {
          step = new AgentStep(
            meta.id,
            meta.name,
            meta.description,
            new Date(meta.createdAt),
            meta.agentId,
          );
        } else {
          step = new HumanStep(
            meta.id,
            meta.name,
            meta.description,
            new Date(meta.createdAt),
            meta.transports as Transport[],
          );
        }
        this.cache.set(step.id, step);
      } catch {
        // Skip malformed step directories
      }
    }
  }
}
