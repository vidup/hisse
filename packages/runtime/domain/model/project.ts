import { TeamId } from "./team";
import { WorkflowId } from "./workflow";

export type ProjectId = string;
export type TaskId = string;

export class Project {
    constructor(
        public readonly id: ProjectId,
        public readonly teamId: TeamId,
        public readonly workflowId: WorkflowId,
        public readonly name: string,
        public readonly path: string,
        public readonly createdAt: Date,
        public updatedAt: Date,
        private readonly _events: Array<ProjectEvent> = [], // for creation only
    ) { }

    static create(params: { name: string; path: string; teamId: TeamId; workflowId: WorkflowId }) {
        const id = crypto.randomUUID();
        return new Project(
            id,
            params.teamId,
            params.workflowId,
            params.name,
            params.path,
            new Date(),
            new Date(),
            [
                new ProjectCreatedEvent(
                    id,
                    params.teamId,
                    params.workflowId,
                    params.name,
                    params.path,
                    new Date(),
                ),
            ],
        );
    }
}

export class ProjectCreatedEvent {
    constructor(
        public readonly id: ProjectId,
        public readonly teamId: TeamId,
        public readonly workflowId: WorkflowId,
        public readonly name: string,
        public readonly path: string,
        public readonly createdAt: Date,
    ) { }
}

export class TaskAddedToProject {
    constructor(
        public readonly id: ProjectId,
        public readonly taskId: TaskId,
        public readonly createdAt: Date,
    ) { }
}

export type ProjectEvent = ProjectCreatedEvent | TaskAddedToProject;
