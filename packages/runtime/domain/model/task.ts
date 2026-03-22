import { ProjectId } from "./project";

export type TaskId = string;

export type TaskStatus = "backlog" | "in_progress" | "completed";

export class Task {
    private newEvents: Array<TaskEvent> = [];
    constructor(
        public readonly id: TaskId,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public updatedAt: Date,
        public status: TaskStatus,
        public readonly projectId: ProjectId,
        private readonly _events: Array<TaskEvent> = [], // for creation only
    ) {
        this.newEvents = _events;
    }

    get events(): Array<TaskEvent> {
        return [...this.newEvents];
    }

    start() {
        if (this.status !== "backlog") {
            throw new Error("Task is not in backlog");
        }
        this.status = "in_progress";
        this.updatedAt = new Date();
        this.newEvents.push(new TaskStarted(this.id, new Date(), this.projectId));
    }

    complete() {
        if (this.status !== "in_progress") {
            throw new Error("Task is not in progress");
        }
        this.status = "completed";
        this.updatedAt = new Date();
        this.newEvents.push(new TaskCompleted(this.id, new Date(), this.projectId));
    }

    static create(params: { name: string; description: string; projectId: ProjectId }) {
        const id = crypto.randomUUID();
        return new Task(
            id,
            params.name,
            params.description,
            new Date(),
            new Date(),
            "backlog",
            params.projectId,
            [
                new TaskCreated(
                    id,
                    params.name,
                    params.description,
                    new Date(),
                    new Date(),
                    "backlog",
                    params.projectId,
                ),
            ],
        );
    }
}

export class TaskCreated {
    constructor(
        public readonly id: TaskId,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly status: TaskStatus,
        public readonly projectId: ProjectId,
    ) { }
}

export class TaskStarted {
    constructor(
        public readonly id: TaskId,
        public readonly startedAt: Date,
        public readonly projectId: ProjectId,
    ) { }
}

export class TaskCompleted {
    constructor(
        public readonly id: TaskId,
        public readonly completedAt: Date,
        public readonly projectId: ProjectId,
    ) { }
}

export type TaskEvent = TaskCreated | TaskStarted | TaskCompleted;
