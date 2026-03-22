import { SkillId } from "./skill";
import { ToolId } from "./tools";

export type AgentId = string;
export class Agent {
  private newEvents: Array<AgentEvent> = [];

  constructor(
    public readonly id: AgentId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly systemPrompt: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly tools: Array<ToolId> = [],
    public readonly skills: Array<SkillId> = [],
    private readonly _events: Array<AgentEvent> = [], // for creation only
  ) {
    this.newEvents = _events;
  }

  get events(): Array<AgentEvent> {
    return [...this.newEvents];
  }

  static create(params: {
    name: string;
    description: string;
    systemPrompt: string;
    provider: string;
    model: string;
    tools: Array<ToolId>;
    skills: Array<SkillId>;
  }) {
    const id = crypto.randomUUID();
    return new Agent(
      id,
      params.name,
      params.description,
      new Date(),
      new Date(),
      params.systemPrompt,
      params.provider,
      params.model,
      params.tools,
      params.skills,
      [
        new AgentCreatedEvent(
          id,
          params.name,
          params.description,
          new Date(),
          params.systemPrompt,
          params.provider,
          params.model,
          params.tools,
          params.skills,
        ),
      ],
    );
  }
}

export class AgentCreatedEvent {
  constructor(
    public readonly agentId: AgentId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly systemPrompt: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly tools: Array<ToolId>,
    public readonly skills: Array<SkillId>,
  ) {}
}

export class AgentUpdatedEvent {
  constructor(
    public readonly agentId: AgentId,
    public readonly name: string,
    public readonly description: string,
    public readonly updatedAt: Date,
    public readonly systemPrompt: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly tools: Array<ToolId>,
    public readonly skills: Array<SkillId>,
  ) {}
}

export type AgentEvent = AgentCreatedEvent | AgentUpdatedEvent;
