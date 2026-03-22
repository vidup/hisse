import { TaskId } from "../../domain/model/task";
import { TasksRepository } from "../../domain/ports/tasks.repository";

export class CompleteStepCommand {
    constructor(public readonly taskId: TaskId) { }
}

export class CompleteStepCommandHandler {
    constructor(private readonly taskRepository: TasksRepository) { }

    async execute(command: CompleteStepCommand) {
        const task = await this.taskRepository.findById(command.taskId);
        if (task === null) {
            throw new Error("Task not found");
        }
        task.complete();
        await this.taskRepository.save(task);
    }
}