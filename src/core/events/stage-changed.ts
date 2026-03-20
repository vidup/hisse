import { STAGES, type Stage } from "../model";
import { DomainEvent, type DomainEventJSON } from "./domain-event";

export class StageChangedEvent extends DomainEvent<"stage.changed"> {
	public static readonly TYPE = "stage.changed" as const;

	constructor(
		public readonly projectId: string,
		public readonly fromStage: Stage,
		public readonly toStage: Stage,
		public readonly reason?: string,
		timestamp?: number,
	) {
		super(StageChangedEvent.TYPE, timestamp);
	}

	toJSON(): DomainEventJSON {
		return {
			type: this.type,
			timestamp: this.timestamp,
			projectId: this.projectId,
			fromStage: this.fromStage,
			toStage: this.toStage,
			reason: this.reason,
		};
	}

	static fromJSON(json: DomainEventJSON): StageChangedEvent {
		if (typeof json.projectId !== "string") throw new Error("stage.changed: projectId must be a string");

		const fromStage = parseStage(json.fromStage, "fromStage");
		const toStage = parseStage(json.toStage, "toStage");
		const reason = typeof json.reason === "string" ? json.reason : undefined;

		return new StageChangedEvent(json.projectId, fromStage, toStage, reason, ensureTimestamp(json.timestamp));
	}
}

function parseStage(value: unknown, field: string): Stage {
	if (typeof value !== "string" || !STAGES.includes(value as Stage)) {
		throw new Error(`stage.changed: ${field} is invalid`);
	}
	return value as Stage;
}

function ensureTimestamp(value: unknown): number {
	if (typeof value !== "number") throw new Error("Event timestamp must be a number");
	return value;
}
