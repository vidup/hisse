import { ProjectsV2Repository } from "../ports/projects.repository";
import { TasksV2Repository } from "../ports/tasks.repository";

export type ProjectId = string;

export class ProjectV2 {
  private events: ProjectEvent[] = [];
  constructor(
    public readonly id: ProjectId,
    public readonly name: string,
    public readonly steps: Array<ProjectStep>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly description?: string,
    events: ProjectEvent[] = [],
  ) {
    this.events = events;
  }

  static create(
    projectId: ProjectId,
    name: string,
    steps: Array<ProjectStep>,
    description?: string,
  ) {
    const project = new ProjectV2(projectId, name, steps, new Date(), new Date(), description, [
      new ProjectCreated(projectId, name, steps, new Date(), new Date(), description),
    ]);
    return project;
  }

  public getEvents() {
    return this.events;
  }
}

class ProjectCreated {
  constructor(
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly steps: Array<ProjectStep>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly description?: string,
  ) {}
}

type ProjectEvent = ProjectCreated;

export type StepId = string;

export class ProjectStep {
  constructor(
    public readonly id: StepId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly actions: Array<StepActionDef>,
    public readonly tasks: Array<Task>,
    public readonly description?: string,
  ) {}
}

type StepActionDef = HumanActionDef | AutomationActionDef | AgentActionDef;

interface BaseActionDef {
  id: string;
  name: string;
  description: string;
}

interface HumanActionDef extends BaseActionDef {
  kind: "human";
  transports: Transport[];
}

interface AutomationActionDef extends BaseActionDef {
  kind: "automation";
  codePath: string;
}

interface AgentActionDef extends BaseActionDef {
  kind: "agent";
  agentId: string;
}

export interface Transport {
  type: string;
  target: string;
  configuration: Record<string, any>;
  authenticated: boolean;
}

export type TaskId = string;

export class Task {
  private events: TaskEvent[] = [];
  constructor(
    public readonly id: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly context: Record<string, any>,
    private _execution: TaskExecution,
    events: TaskEvent[] = [],
    public readonly description?: string,
  ) {
    this.events = events;
  }

  public get execution() {
    // I will probably add a reset function later that reinitializes a new execution, hence the getter.
    return this._execution;
  }

  public getEvents() {
    return this.events;
  }
}

class TaskCreated {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

class TaskCompleted {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

class TaskAbandoned {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

class TaskEnteredAction {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

// For the infrastructure layer that will actually start the action execution
class TaskActionStarted {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

class TaskActionCompleted {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

class TaskMovedToStep {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

// For the domain layer that will request the action execution via the service.
class TaskActionExecutionRequested {
  constructor(
    public readonly taskId: TaskId,
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

type TaskEvent =
  | TaskCreated
  | TaskCompleted
  | TaskAbandoned
  | TaskEnteredAction
  | TaskActionStarted
  | TaskActionCompleted
  | TaskMovedToStep;

type ActionId = string;

class TaskExecution {
  constructor(
    public readonly taskId: TaskId,
    public currentStepId: StepId,
    public currentActionId: ActionId,
    public mapping: Record<StepId, Record<ActionId, ActionExecutionState>>,
    public status: "backlog" | "in_progress" | "completed" | "abandonned",
    private addEvent: (event: TaskEvent) => void,
    public startedAt?: Date,
    public completedAt?: Date,
    public abandonedAt?: Date,
  ) {}

  startCurrentAction(actionId: string) {
    if (this.status !== "backlog") {
      throw new Error("Task is not in backlog");
    }
    this.status = "in_progress";
    this.startedAt = new Date();
    this.currentActionId = actionId;
    this.mapping[this.currentStepId] = this.mapping[this.currentStepId] || [];
    this.mapping[this.currentStepId][actionId] = {
      actionId,
      status: "running",
      startedAt: this.startedAt,
    };

    this.addEvent(
      new TaskActionExecutionRequested(
        this.taskId,
        this.currentStepId,
        actionId,
        this.startedAt,
        new Date(),
      ),
    );
  }

  completeCurrentAction(result: Record<string, any>) {
    if (this.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }
    this.status = "completed";
    this.completedAt = new Date();
    const currentAction = this.mapping[this.currentStepId][this.currentActionId];
    if (!currentAction || currentAction.status !== "running") {
      throw new Error("Current action not found");
    }

    this.mapping[this.currentStepId][this.currentActionId] = {
      actionId: this.currentActionId,
      status: "completed",
      startedAt: currentAction.startedAt,
      completedAt: this.completedAt,
      durationMs: this.completedAt.getTime() - currentAction.startedAt.getTime(),
      result,
    };

    this.addEvent(
      new TaskActionCompleted(
        this.taskId,
        this.currentStepId,
        this.currentActionId,
        this.completedAt,
        new Date(),
      ),
    );
  }

  abandon() {
    if (this.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }
    this.status = "abandonned";
    this.abandonedAt = new Date();
  }

  moveToStepAndAction(stepId: StepId, actionId: string) {
    if (this.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }
    this.currentStepId = stepId;
    this.currentActionId = actionId;
    this.mapping[this.currentStepId] = this.mapping[this.currentStepId] || {};
    this.mapping[this.currentStepId][this.currentActionId] = {
      actionId: this.currentActionId,
      status: "idle",
    };

    this.addEvent(
      new TaskMovedToStep(
        this.taskId,
        this.currentStepId,
        this.currentActionId,
        new Date(),
        new Date(),
      ),
    );
    this.addEvent(
      new TaskEnteredAction(
        this.taskId,
        this.currentStepId,
        this.currentActionId,
        new Date(),
        new Date(),
      ),
    );
  }

  moveToAction(actionId: string) {
    if (this.status !== "in_progress") {
      throw new Error("Task is not in progress");
    }
    this.currentActionId = actionId;
    this.mapping[this.currentStepId] = this.mapping[this.currentStepId] || {};
    this.mapping[this.currentStepId][this.currentActionId] = {
      actionId: this.currentActionId,
      status: "idle",
    };

    this.addEvent(
      new TaskEnteredAction(
        this.taskId,
        this.currentStepId,
        this.currentActionId,
        new Date(),
        new Date(),
      ),
    );
  }
}

type ActionExecutionState =
  | {
      actionId: string;
      status: "idle";
    }
  | {
      actionId: string;
      status: "running";
      startedAt: Date;
    }
  | {
      actionId: string;
      status: "completed";
      startedAt: Date;
      completedAt: Date;
      durationMs: number;
      result: Record<string, any>;
    }
  | {
      actionId: string;
      status: "abandonned";
      startedAt: Date;
      failedAt: Date;
      durationMs: number;
      reason: string;
    };

class WorkflowExecutorService {
  constructor(
    public readonly taskRepository: TasksV2Repository,
    public readonly projectsRepository: ProjectsV2Repository,
  ) {}

  async executeTask(taskId: TaskId) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const project = await this.projectsRepository.findById(task.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const taskExecution = task.execution;
    const status = taskExecution.status;
    if (status === "backlog") {
      const firstStep = project.steps[0];
      taskExecution.moveToStepAndAction(firstStep.id, firstStep.actions[0].id);
      taskExecution.startCurrentAction(firstStep.actions[0].id);
      await this.taskRepository.save(task);
    } else {
      throw new Error("Not implemented yet");
    }
  }
}
