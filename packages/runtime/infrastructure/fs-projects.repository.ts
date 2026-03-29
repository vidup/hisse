import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Project,
  ProjectId,
  type ProjectWorkflow,
} from "../domain/model/project.js";
import {
  AgentStep,
  HumanStep,
  type Step,
  type Transport,
} from "../domain/model/steps.js";
import type { ProjectsRepository } from "../domain/ports/projects.repository.js";

interface SerializedAgentStep {
  type: "agent";
  id: string;
  name: string;
  description: string;
  createdAt: string;
  agentId: string;
}

interface SerializedHumanStep {
  type: "human";
  id: string;
  name: string;
  description: string;
  createdAt: string;
  transports: Transport[];
}

interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  workflow: {
    id: string;
    steps: Array<SerializedAgentStep | SerializedHumanStep>;
  };
  createdAt: string;
  updatedAt: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export class FsProjectsRepository implements ProjectsRepository {
  constructor(private readonly basePath: string) {}

  async save(project: Project): Promise<void> {
    const slug = slugify(project.name);
    const projectDir = path.join(this.basePath, slug);
    await mkdir(projectDir, { recursive: true });

    const record: ProjectRecord = {
      id: project.id,
      name: project.name,
      description: project.description,
      workflow: serializeWorkflow(project.workflow),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };

    await writeFile(
      path.join(projectDir, "project.json"),
      JSON.stringify(record, null, 2) + "\n",
      "utf-8",
    );
  }

  async findById(projectId: ProjectId): Promise<Project | null> {
    const projectDirs = await this.listProjectDirs();

    for (const projectDir of projectDirs) {
      try {
        const raw = await readFile(path.join(this.basePath, projectDir, "project.json"), "utf-8");
        const record: ProjectRecord = JSON.parse(raw);
        if (record.id === projectId) {
          return this.toProject(record);
        }
      } catch {
        // Skip malformed project directories
      }
    }

    return null;
  }

  async findAll(): Promise<Project[]> {
    const projectDirs = await this.listProjectDirs();
    const projects: Project[] = [];

    for (const projectDir of projectDirs) {
      try {
        const raw = await readFile(path.join(this.basePath, projectDir, "project.json"), "utf-8");
        const record: ProjectRecord = JSON.parse(raw);
        projects.push(this.toProject(record));
      } catch {
        // Skip malformed project directories
      }
    }

    return projects;
  }

  private async listProjectDirs(): Promise<string[]> {
    try {
      const dirents = await readdir(this.basePath, { withFileTypes: true });
      return dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
    } catch {
      return [];
    }
  }

  private toProject(record: ProjectRecord): Project {
    return new Project(
      record.id,
      record.name,
      record.description,
      deserializeWorkflow(record.workflow),
      new Date(record.createdAt),
      new Date(record.updatedAt),
    );
  }
}

function serializeWorkflow(workflow: ProjectWorkflow): ProjectRecord["workflow"] {
  return {
    id: workflow.id,
    steps: workflow.steps.map((step) => {
      if (step instanceof AgentStep) {
        return {
          type: "agent",
          id: step.id,
          name: step.name,
          description: step.description,
          createdAt: step.createdAt.toISOString(),
          agentId: step.agentId,
        };
      }

      return {
        type: "human",
        id: step.id,
        name: step.name,
        description: step.description,
        createdAt: step.createdAt.toISOString(),
        transports: step.transports,
      };
    }),
  };
}

function deserializeWorkflow(record: ProjectRecord["workflow"]): ProjectWorkflow {
  return {
    id: record.id,
    steps: record.steps.map(deserializeStep),
  };
}

function deserializeStep(record: ProjectRecord["workflow"]["steps"][number]): Step {
  if (record.type === "agent") {
    return new AgentStep(
      record.id,
      record.name,
      record.description,
      new Date(record.createdAt),
      record.agentId,
    );
  }

  return new HumanStep(
    record.id,
    record.name,
    record.description,
    new Date(record.createdAt),
    record.transports.map((transport) => ({
      ...transport,
      configuration: { ...transport.configuration },
    })),
  );
}
