import { ProjectId } from "./project";
import { StepId } from "./steps";
import type { ConversationQuestionDefinition, ConversationQuestionAnswer } from "./message";

export type TaskId = string;

export type TaskStatus = "backlog" | "in_progress" | "completed";

export interface StepInputRequest {
  title?: string;
  instructions?: string;
  questions: ConversationQuestionDefinition[];
}

export interface StepInputResponse {
  answers: ConversationQuestionAnswer[];
  answeredAt: Date;
}

export type StepExecutionState =
  | { status: "idle" }
  | { status: "running"; startedAt: Date }
  | { status: "completed"; startedAt: Date; completedAt: Date; durationMs: number }
  | { status: "failed"; startedAt: Date; failedAt: Date; durationMs: number; reason: string }
  | { status: "waiting_for_input"; startedAt: Date; inputRequest: StepInputRequest; inputResponse?: StepInputResponse };

export type StepExecutionStatus = StepExecutionState["status"];

export class TaskCurrentStep {
  constructor(
    public readonly id: StepId,
    public executionState: StepExecutionState = { status: "idle" },
  ) { }
}

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
    public currentStep: TaskCurrentStep | null = null,
    private readonly _events: Array<TaskEvent> = [],
  ) {
    this.newEvents = _events;
  }

  get events(): Array<TaskEvent> {
    return [...this.newEvents];
  }

  start(step: TaskCurrentStep) {
    if (this.status !== "backlog") {
      throw new Error("Task is not in backlog");
    }
    this.status = "in_progress";
    this.updatedAt = new Date();
    this.currentStep = step;
    this.newEvents.push(new TaskStarted(this.id, new Date(), this.projectId));
    this.newEvents.push(new TaskMovedToStep(this.id, step, new Date()));
  }

  moveToStep(step: TaskCurrentStep) {
    if (this.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }
    this.currentStep = step;
    this.updatedAt = new Date();
    this.newEvents.push(new TaskMovedToStep(this.id, step, new Date()));
  }

  complete() {
    if (this.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }
    this.status = "completed";
    this.currentStep = null;
    this.updatedAt = new Date();
    this.newEvents.push(new TaskCompleted(this.id, new Date(), this.projectId));
  }

  markStepRunning() {
    if (!this.currentStep) throw new Error("No current step");
    this.currentStep.executionState = { status: "running", startedAt: new Date() };
    this.updatedAt = new Date();
  }

  markStepCompleted() {
    if (!this.currentStep) throw new Error("No current step");
    const state = this.currentStep.executionState;
    const startedAt = state.status === "running" ? state.startedAt : new Date();
    const completedAt = new Date();
    this.currentStep.executionState = {
      status: "completed",
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
    this.updatedAt = new Date();
  }

  markStepFailed(reason: string) {
    if (!this.currentStep) throw new Error("No current step");
    const state = this.currentStep.executionState;
    const startedAt = state.status === "running" ? state.startedAt : new Date();
    const failedAt = new Date();
    this.currentStep.executionState = {
      status: "failed",
      startedAt,
      failedAt,
      durationMs: failedAt.getTime() - startedAt.getTime(),
      reason,
    };
    this.updatedAt = new Date();
  }

  markStepWaitingForInput(inputRequest: StepInputRequest) {
    if (!this.currentStep) throw new Error("No current step");
    const state = this.currentStep.executionState;
    const startedAt = state.status === "running" ? state.startedAt : new Date();
    this.currentStep.executionState = {
      status: "waiting_for_input",
      startedAt,
      inputRequest,
    };
    this.updatedAt = new Date();
  }

  provideStepInput(answers: ConversationQuestionAnswer[]) {
    if (!this.currentStep) throw new Error("No current step");
    const state = this.currentStep.executionState;
    if (state.status !== "waiting_for_input") {
      throw new Error("Step is not waiting for input");
    }
    state.inputResponse = { answers, answeredAt: new Date() };
    this.updatedAt = new Date();
  }

  static create(params: { name: string; description: string; projectId: ProjectId }) {
    const id = crypto.randomUUID();
    return new Task(id, params.name, params.description, new Date(), new Date(), "backlog", params.projectId, null, [
      new TaskCreated(id, params.name, params.description, new Date(), new Date(), "backlog", params.projectId),
    ]);
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

export class TaskMovedToStep {
  constructor(
    public readonly id: TaskId,
    public readonly step: TaskCurrentStep,
    public readonly movedAt: Date,
  ) { }
}

export class TaskCompleted {
  constructor(
    public readonly id: TaskId,
    public readonly completedAt: Date,
    public readonly projectId: ProjectId,
  ) { }
}

export type TaskEvent = TaskCreated | TaskStarted | TaskMovedToStep | TaskCompleted;
