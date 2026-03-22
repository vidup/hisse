import { ProjectId } from "../../domain/model/project";
import { Task } from "../../domain/model/task";
import type { ProjectsRepository } from "../../domain/ports/projects.repository";
import type { TasksRepository } from "../../domain/ports/tasks.repository";

export class AddTaskToProjectCommand {
    constructor(
        public readonly name: string,
        public readonly description: string,
        public readonly projectId: ProjectId,
    ) { }
}

export class AddTaskToProjectCommandHandler {
    constructor(private readonly projectRepository: ProjectsRepository, private readonly taskRepository: TasksRepository) { }

    async execute(command: AddTaskToProjectCommand) {
        const project = await this.projectRepository.findById(command.projectId);

        if (project === null) {
            throw new Error("Project not found");
        }

        const task = Task.create({ name: command.name, description: command.description, projectId: command.projectId });
        await this.taskRepository.save(task);
    }
}
