import { TASK_STATUSES, type TaskStatus } from "../model";
import { DomainEvent, type DomainEventJSON } from "./domain-event";

export class TaskAddedEvent extends DomainEvent<"task.added"> {
	public static readonly TYPE = "task.added" as const;

	constructor(
		public readonly projectId: string,
		public readonly taskId: string,
		public readonly title: string,
		public readonly status: TaskStatus = "todo",
		timestamp?: number,
	) {
		super(TaskAddedEvent.TYPE, timestamp);
	}

	toJSON(): DomainEventJSON {
		return {
			type: this.type,
			timestamp: this.timestamp,
			projectId: this.projectId,
			taskId: this.taskId,
			title: this.title,
			status: this.status,
		};
	}

	static fromJSON(json: DomainEventJSON): TaskAddedEvent {
		if (typeof json.projectId !== "string") throw new Error("task.added: projectId must be a string");
		if (typeof json.taskId !== "string") throw new Error("task.added: taskId must be a string");
		if (typeof json.title !== "string") throw new Error("task.added: title must be a string");
		const status = parseStatus(json.status);

		return new TaskAddedEvent(json.projectId, json.taskId, json.title, status, ensureTimestamp(json.timestamp));
	}
}

function parseStatus(value: unknown): TaskStatus {
	if (typeof value !== "string" || !TASK_STATUSES.includes(value as TaskStatus)) {
		throw new Error("task.added: status is invalid");
	}
	return value as TaskStatus;
}

function ensureTimestamp(value: unknown): number {
	if (typeof value !== "number") throw new Error("Event timestamp must be a number");
	return value;
}
