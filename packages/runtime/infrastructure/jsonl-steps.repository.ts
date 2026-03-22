import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  HumanStep,
  AgentStep,
  Step,
  StepId,
  Transport,
} from "../domain/model/steps.js";
import type { StepsRepository } from "../domain/ports/steps.repository.js";

interface HumanStepRecord {
  kind: "human";
  id: string;
  name: string;
  description: string;
  createdAt: string;
  transports: Transport[];
}

interface AgentStepRecord {
  kind: "agent";
  id: string;
  name: string;
  description: string;
  createdAt: string;
  agentId: string;
}

type StepRecord = HumanStepRecord | AgentStepRecord;

export class JsonlStepsRepository implements StepsRepository {
  private cache: Map<StepId, Step> | null = null;

  constructor(private readonly filePath: string) {}

  async save(step: Step): Promise<void> {
    await this.ensureLoaded();
    this.cache!.set(step.id, step);
    await this.persist();
  }

  async getLibrary(): Promise<Step[]> {
    await this.ensureLoaded();
    return Array.from(this.cache!.values());
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
      const record: StepRecord = JSON.parse(line);
      const step = this.deserializeStep(record);
      this.cache.set(step.id, step);
    }
  }

  private deserializeStep(record: StepRecord): Step {
    if (record.kind === "human") {
      return new HumanStep(
        record.id,
        record.name,
        record.description,
        new Date(record.createdAt),
        record.transports,
      );
    }
    return new AgentStep(
      record.id,
      record.name,
      record.description,
      new Date(record.createdAt),
      record.agentId,
    );
  }

  private serializeStep(step: Step): StepRecord {
    if (step instanceof HumanStep) {
      return {
        kind: "human",
        id: step.id,
        name: step.name,
        description: step.description,
        createdAt: step.createdAt.toISOString(),
        transports: step.transports,
      };
    }
    const agentStep = step as AgentStep;
    return {
      kind: "agent",
      id: agentStep.id,
      name: agentStep.name,
      description: agentStep.description,
      createdAt: agentStep.createdAt.toISOString(),
      agentId: agentStep.agentId,
    };
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const lines: string[] = [];
    for (const step of this.cache!.values()) {
      lines.push(JSON.stringify(this.serializeStep(step)));
    }
    await writeFile(this.filePath, lines.join("\n") + "\n", "utf-8");
  }
}
