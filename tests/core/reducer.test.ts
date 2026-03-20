import { describe, expect, it } from "vitest";

import {
  ProjectCreatedEvent,
  StageChangedEvent,
  TaskAddedEvent,
  TaskStatusChangedEvent,
  reduceEvents,
} from "../../src";

describe("reduceEvents", () => {
  it("reconstruit l'état attendu à partir des événements", () => {
    const events = [
      new ProjectCreatedEvent("p1", "Projet 1"),
      new TaskAddedEvent("p1", "t1", "Init core"),
      new TaskStatusChangedEvent("p1", "t1", "todo", "in_progress"),
      new StageChangedEvent("p1", "backlog", "brainstorming"),
    ];

    const state = reduceEvents(events);

    expect(state.projectId).toBe("p1");
    expect(state.name).toBe("Projet 1");
    expect(state.stage).toBe("brainstorming");
    expect(state.tasks.t1).toMatchObject({
      id: "t1",
      title: "Init core",
      status: "in_progress",
    });
  });

  it("bloque une transition de stage interdite", () => {
    const events = [
      new ProjectCreatedEvent("p1", "Projet 1", "brainstorming"),
      new StageChangedEvent("p1", "backlog", "shipped"),
    ];

    expect(() => reduceEvents(events)).toThrow(
      "Invalid stage change: current=brainstorming, event.from=backlog",
    );
  });

  it("bloque un changement de statut incohérent", () => {
    const events = [
      new ProjectCreatedEvent("p1", "Projet 1"),
      new TaskAddedEvent("p1", "t1", "Init core"),
      new TaskStatusChangedEvent("p1", "t1", "done", "blocked"),
    ];

    expect(() => reduceEvents(events)).toThrow("Invalid task status change");
  });

  it("bloque une création sur un projet déjà existant", () => {
    const events = [
      new ProjectCreatedEvent("p1", "Projet 1"),
      new ProjectCreatedEvent("p1", "Projet 1"),
    ];

    expect(() => reduceEvents(events)).toThrow("Project already created: p1");
  });
});
