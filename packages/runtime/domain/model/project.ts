import type { Step } from "./steps";

export type ProjectId = string;
export type TaskId = string;
export type ProjectWorkflowId = string;

export interface ProjectWorkflow {
  id: ProjectWorkflowId;
  steps: Step[];
}

export class Project {
  constructor(
    public readonly id: ProjectId,
    public readonly name: string,
    public readonly description: string,
    public workflow: ProjectWorkflow,
    public readonly createdAt: Date,
    public updatedAt: Date,
    private readonly _events: Array<ProjectEvent> = [],
  ) {}

  static create(params: { name: string; description: string }) {
    const id = crypto.randomUUID();
    const workflowId = crypto.randomUUID();
    return new Project(id, params.name, params.description, { id: workflowId, steps: [] }, new Date(), new Date(), [
      new ProjectCreatedEvent(id, params.name, params.description, workflowId, new Date()),
    ]);
  }

  updateWorkflow(steps: Step[]) {
    this.workflow = {
      ...this.workflow,
      steps,
    };
    this.updatedAt = new Date();
  }
}

export class ProjectCreatedEvent {
  constructor(
    public readonly id: ProjectId,
    public readonly name: string,
    public readonly description: string,
    public readonly workflowId: ProjectWorkflowId,
    public readonly createdAt: Date,
  ) {}
}

export class TaskAddedToProject {
  constructor(
    public readonly id: ProjectId,
    public readonly taskId: TaskId,
    public readonly createdAt: Date,
  ) {}
}

export type ProjectEvent = ProjectCreatedEvent | TaskAddedToProject;
