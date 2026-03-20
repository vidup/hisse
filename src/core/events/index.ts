import { DomainEvent, type DomainEventJSON } from "./domain-event";
import { ProjectCreatedEvent } from "./project-created";
import { StageChangedEvent } from "./stage-changed";
import { TaskAddedEvent } from "./task-added";
import { TaskStatusChangedEvent } from "./task-status-changed";

export type HisseEvent =
  | ProjectCreatedEvent
  | StageChangedEvent
  | TaskAddedEvent
  | TaskStatusChangedEvent;

const EVENT_FACTORIES: Record<string, (json: DomainEventJSON) => HisseEvent> = {
  [ProjectCreatedEvent.TYPE]: ProjectCreatedEvent.fromJSON,
  [StageChangedEvent.TYPE]: StageChangedEvent.fromJSON,
  [TaskAddedEvent.TYPE]: TaskAddedEvent.fromJSON,
  [TaskStatusChangedEvent.TYPE]: TaskStatusChangedEvent.fromJSON,
};

export function eventFromJSON(json: DomainEventJSON): HisseEvent {
  const factory = EVENT_FACTORIES[json.type];
  if (!factory) {
    throw new Error(`Unknown event type: ${json.type}`);
  }
  return factory(json);
}

export function parseEventLine<T extends HisseEvent>(line: string): T {
  const parsed = JSON.parse(line) as DomainEventJSON;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.type !== "string"
  ) {
    throw new Error("Invalid event line: missing type");
  }
  return eventFromJSON(parsed) as T;
}

export function stringifyEvent(event: DomainEvent): string {
  return JSON.stringify(event.toJSON());
}

export { DomainEvent, type DomainEventJSON };
export { ProjectCreatedEvent } from "./project-created";
export { StageChangedEvent } from "./stage-changed";
export { TaskAddedEvent } from "./task-added";
export { TaskStatusChangedEvent } from "./task-status-changed";
