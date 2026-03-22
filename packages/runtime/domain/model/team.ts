export type TeamId = string;

export class Team {
  private newEvents: Array<TeamEvent> = [];
  constructor(
    public readonly id: TeamId,
    public readonly name: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly folderPath: string,
    private readonly _events: Array<TeamEvent> = [],
  ) {
    this.newEvents = _events;
  }

  get events(): Array<TeamEvent> {
    return [...this.newEvents];
  }

  static create(params: { name: string; description: string; folderPath: string }) {
    const id = crypto.randomUUID();
    return new Team(
      id,
      params.name,
      params.description,
      new Date(),
      new Date(),
      params.folderPath,
      [new TeamCreatedEvent(id, params.name, params.description, params.folderPath, new Date())],
    );
  }
}

export class TeamCreatedEvent {
  constructor(
    public readonly teamId: TeamId,
    public readonly name: string,
    public readonly description: string,
    public readonly folderPath: string,
    public readonly createdAt: Date,
  ) {}
}

export type TeamEvent = TeamCreatedEvent;
