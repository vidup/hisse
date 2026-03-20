import { describe, expect, it } from "vitest";

import { ProjectCreatedEvent, parseEventLine, stringifyEvent } from "../../src";

describe("events serialization", () => {
  it("sérialise et réhydrate un event de classe", () => {
    const event = new ProjectCreatedEvent("demo", "Demo", "backlog", 123456);

    const line = stringifyEvent(event);
    const hydrated = parseEventLine<ProjectCreatedEvent>(line);

    expect(hydrated).toBeInstanceOf(ProjectCreatedEvent);
    expect(hydrated.type).toBe("project.created");
    expect(hydrated.timestamp).toBe(123456);
    expect(hydrated.projectId).toBe("demo");
    expect(hydrated.name).toBe("Demo");
  });
});
