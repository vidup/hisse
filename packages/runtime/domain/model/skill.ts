export class Skill {
  private newEvents: Array<SkillEvent> = [];
  constructor(
    public readonly id: SkillId,
    public name: string,
    public description: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public skillContent: string, // basically SKILL.md content
    _events: Array<SkillEvent> = [], // for creation only
  ) {
    this.newEvents = _events;
  }

  get events(): Array<SkillEvent> {
    return [...this.newEvents];
  }

  static create(params: { name: string; description: string; content: string }) {
    const id = crypto.randomUUID();
    return new Skill(
      id,
      params.name,
      params.description,
      new Date(),
      new Date(),
      params.content,
      [new SkillCreatedEvent(id, params.name, params.description, new Date(), params.content)],
    );
  }
}

export type SkillId = string;

export class SkillCreatedEvent {
  constructor(
    public readonly skillId: SkillId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly skillContent: string, // basically SKILL.md content
  ) { }
}

export class SkillUpdatedEvent {
  constructor(
    public readonly skillId: SkillId,
    public readonly name: string,
    public readonly description: string,
    public readonly updatedAt: Date,
    public readonly skillContent: string, // basically SKILL.md content
  ) { }
}

export type SkillEvent = SkillCreatedEvent | SkillUpdatedEvent;
