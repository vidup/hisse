export type WorkspaceId = string;

export class Workspace {
  private newEvents: Array<WorkspaceEvent> = [];

  constructor(
    public readonly id: WorkspaceId,
    public readonly name: string,
    public readonly createdAt: Date,
    private readonly _events: Array<WorkspaceEvent> = [], // for creation only
  ) {}

  get events(): Array<WorkspaceEvent> {
    return [...this.newEvents];
  }

  static create(params: { name: string }) {
    const id = crypto.randomUUID();
    return new Workspace(id, params.name, new Date(), [
      new WorkspaceCreatedEvent(id, params.name, new Date()),
    ]);
  }
}

export class WorkspaceCreatedEvent {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}
}

export type WorkspaceEvent = WorkspaceCreatedEvent;
