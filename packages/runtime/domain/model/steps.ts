import { AgentId } from "./agent";

export type StepId = string;

export class HumanStep {
  private newEvents: Array<StepEvent> = [];
  constructor(
    public readonly id: StepId,
    public name: string,
    public description: string,
    public createdAt: Date,
    public transports: Array<Transport> = [],
    private readonly _events: Array<StepEvent> = [], // for creation only
  ) {
    this.newEvents = _events;
  }

  static create(params: { name: string; description: string; transports: Array<Transport> }) {
    const id = crypto.randomUUID();
    return new HumanStep(id, params.name, params.description, new Date(), params.transports, [
      new StepCreatedEvent(id, params.name, params.description, new Date(), {
        kind: "human",
        transports: params.transports,
      }),
    ]);
  }
}

export interface Transport {
  type: string;
  target: string;
  configuration: Record<string, any>;
  authenticated: boolean;
}

export class AgentStep {
  private newEvents: Array<StepEvent> = [];
  constructor(
    public readonly id: StepId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly agentId: AgentId,
    private readonly _events: Array<StepEvent> = [], // for creation only
  ) {
    this.newEvents = _events;
  }

  static create(params: { name: string; description: string; agentId: AgentId }) {
    const id = crypto.randomUUID();
    return new AgentStep(id, params.name, params.description, new Date(), params.agentId, [
      new StepCreatedEvent(id, params.name, params.description, new Date(), {
        kind: "agent",
        agentId: params.agentId,
      }),
    ]);
  }
}

export class AutomationStep {
  private newEvents: Array<StepEvent> = [];
  constructor(
    public readonly id: StepId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly codePath: string, // relative path from .hisse/ (e.g. "projects/my-project/automation-steps/verify-brief.ts")
    private readonly _events: Array<StepEvent> = [],
  ) {
    this.newEvents = _events;
  }

  static create(params: { name: string; description: string; codePath: string }) {
    const id = crypto.randomUUID();
    return new AutomationStep(id, params.name, params.description, new Date(), params.codePath, [
      new StepCreatedEvent(id, params.name, params.description, new Date(), {
        kind: "automation",
        codePath: params.codePath,
      }),
    ]);
  }
}

export class StepCreatedEvent {
  constructor(
    public readonly stepId: StepId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly parameters:
      | { kind: "agent"; agentId: AgentId }
      | { kind: "human"; transports: Array<Transport> }
      | { kind: "automation"; codePath: string },
  ) {}
}

export type Step = HumanStep | AgentStep | AutomationStep;
export type StepEvent = StepCreatedEvent;
