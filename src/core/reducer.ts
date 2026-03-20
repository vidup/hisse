import {
  canTransitionStage,
  initialProjectState,
  type ProjectState,
} from "./model";
import {
  ProjectCreatedEvent,
  StageChangedEvent,
  TaskAddedEvent,
  TaskStatusChangedEvent,
  type HisseEvent,
} from "./events";

export function reduceEvents(events: HisseEvent[]): ProjectState {
  return events.reduce(
    (state, event) => applyEvent(state, event),
    initialProjectState,
  );
}

export function applyEvent(
  state: ProjectState,
  event: HisseEvent,
): ProjectState {
  if (event instanceof ProjectCreatedEvent) {
    const isAlreadyCreated = state.projectId !== null;
    if (isAlreadyCreated) {
      throw new Error(`Project already created: ${event.projectId}`);
    }
    return {
      projectId: event.projectId,
      name: event.name,
      stage: event.initialStage,
      tasks: {},
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
    };
  }

  if (!state.projectId) {
    throw new Error(`Cannot apply ${event.type} before project.created`);
  }

  if (event.projectId !== state.projectId) {
    throw new Error(
      `Event project mismatch: expected ${state.projectId}, got ${event.projectId}`,
    );
  }

  if (event instanceof StageChangedEvent) {
    if (!state.stage) throw new Error("Current stage is missing");
    if (state.stage !== event.fromStage) {
      throw new Error(
        `Invalid stage change: current=${state.stage}, event.from=${event.fromStage}`,
      );
    }
    if (!canTransitionStage(event.fromStage, event.toStage)) {
      throw new Error(
        `Forbidden stage transition: ${event.fromStage} -> ${event.toStage}`,
      );
    }
    return {
      ...state,
      stage: event.toStage,
      updatedAt: event.timestamp,
    };
  }

  if (event instanceof TaskAddedEvent) {
    if (state.tasks[event.taskId]) {
      throw new Error(`Task already exists: ${event.taskId}`);
    }
    return {
      ...state,
      tasks: {
        ...state.tasks,
        [event.taskId]: {
          id: event.taskId,
          title: event.title,
          status: event.status,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        },
      },
      updatedAt: event.timestamp,
    };
  }

  if (event instanceof TaskStatusChangedEvent) {
    const task = state.tasks[event.taskId];
    if (!task) {
      throw new Error(`Task not found: ${event.taskId}`);
    }
    if (task.status !== event.fromStatus) {
      throw new Error(
        `Invalid task status change for ${task.id}: current=${task.status}, event.from=${event.fromStatus}`,
      );
    }
    return {
      ...state,
      tasks: {
        ...state.tasks,
        [event.taskId]: {
          ...task,
          status: event.toStatus,
          updatedAt: event.timestamp,
        },
      },
      updatedAt: event.timestamp,
    };
  }

  return state;
}
