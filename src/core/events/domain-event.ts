export interface DomainEventJSON {
	type: string;
	timestamp: number;
	[key: string]: unknown;
}

export abstract class DomainEvent<TType extends string = string> {
	public readonly type: TType;
	public readonly timestamp: number;

	protected constructor(type: TType, timestamp?: number) {
		this.type = type;
		this.timestamp = timestamp ?? Date.now();
	}

	abstract toJSON(): DomainEventJSON;
}
