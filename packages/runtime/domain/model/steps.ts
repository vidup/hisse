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

export class StepCreatedEvent {
  constructor(
    public readonly stepId: StepId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly parameters:
      | { kind: "agent"; agentId: AgentId }
      | { kind: "human"; transports: Array<Transport> },
  ) {}
}

export type Step = HumanStep | AgentStep;
export type StepEvent = StepCreatedEvent;
