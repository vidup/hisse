import { StepId } from "./steps";

export class Workflow {
  private newEvents: Array<WorkflowEvent> = [];

  constructor(
    public readonly id: WorkflowId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
    private _steps: Array<StepId> = [],
    private readonly _events: Array<WorkflowEvent> = [], // for creation only
  ) {
    this.newEvents = _events;
  }

  get steps(): Array<StepId> {
    return [...this._steps];
  }

  set steps(steps: Array<StepId>) {
    this._steps = steps;
    this.newEvents.push(new WorkflowStepsUpdated(this.id, steps, new Date()));
  }

  static create(params: { name: string; description: string }) {
    const id = crypto.randomUUID();
    return new Workflow(
      id,
      params.name,
      params.description,
      new Date(),
      new Date(),
      [],
      [new WorkflowCreated(id, params.name, params.description, new Date())],
    );
  }
}

export type WorkflowId = string;

export class WorkflowCreated {
  constructor(
    public readonly id: WorkflowId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
  ) {}
}

export class WorkflowStepsUpdated {
  constructor(
    public readonly id: WorkflowId,
    public readonly steps: Array<StepId>,
    public readonly updatedAt: Date,
  ) {}
}

export type WorkflowEvent = WorkflowCreated | WorkflowStepsUpdated;
