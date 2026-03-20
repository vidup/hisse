import { STAGES, type Stage } from "../model";
import { DomainEvent, type DomainEventJSON } from "./domain-event";

export class ProjectCreatedEvent extends DomainEvent<"project.created"> {
	public static readonly TYPE = "project.created" as const;

	constructor(
		public readonly projectId: string,
		public readonly name: string,
		public readonly initialStage: Stage = "backlog",
		timestamp?: number,
	) {
		super(ProjectCreatedEvent.TYPE, timestamp);
	}

	toJSON(): DomainEventJSON {
		return {
			type: this.type,
			timestamp: this.timestamp,
			projectId: this.projectId,
			name: this.name,
			initialStage: this.initialStage,
		};
	}

	static fromJSON(json: DomainEventJSON): ProjectCreatedEvent {
		if (typeof json.projectId !== "string") throw new Error("project.created: projectId must be a string");
		if (typeof json.name !== "string") throw new Error("project.created: name must be a string");

		const stage = json.initialStage;
		if (typeof stage !== "string" || !STAGES.includes(stage as Stage)) {
			throw new Error("project.created: initialStage is invalid");
		}

		return new ProjectCreatedEvent(json.projectId, json.name, stage as Stage, ensureTimestamp(json.timestamp));
	}
}

function ensureTimestamp(value: unknown): number {
	if (typeof value !== "number") throw new Error("Event timestamp must be a number");
	return value;
}
