import { TASK_STATUSES, type TaskStatus } from "../model";
import { DomainEvent, type DomainEventJSON } from "./domain-event";

export class TaskStatusChangedEvent extends DomainEvent<"task.status_changed"> {
	public static readonly TYPE = "task.status_changed" as const;

	constructor(
		public readonly projectId: string,
		public readonly taskId: string,
		public readonly fromStatus: TaskStatus,
		public readonly toStatus: TaskStatus,
		timestamp?: number,
	) {
		super(TaskStatusChangedEvent.TYPE, timestamp);
	}

	toJSON(): DomainEventJSON {
		return {
			type: this.type,
			timestamp: this.timestamp,
			projectId: this.projectId,
			taskId: this.taskId,
			fromStatus: this.fromStatus,
			toStatus: this.toStatus,
		};
	}

	static fromJSON(json: DomainEventJSON): TaskStatusChangedEvent {
		if (typeof json.projectId !== "string") throw new Error("task.status_changed: projectId must be a string");
		if (typeof json.taskId !== "string") throw new Error("task.status_changed: taskId must be a string");

		const fromStatus = parseStatus(json.fromStatus, "fromStatus");
		const toStatus = parseStatus(json.toStatus, "toStatus");

		return new TaskStatusChangedEvent(
			json.projectId,
			json.taskId,
			fromStatus,
			toStatus,
			ensureTimestamp(json.timestamp),
		);
	}
}

function parseStatus(value: unknown, field: string): TaskStatus {
	if (typeof value !== "string" || !TASK_STATUSES.includes(value as TaskStatus)) {
		throw new Error(`task.status_changed: ${field} is invalid`);
	}
	return value as TaskStatus;
}

function ensureTimestamp(value: unknown): number {
	if (typeof value !== "number") throw new Error("Event timestamp must be a number");
	return value;
}
