import { StepId } from "../../domain/model/steps";
import { TaskId } from "../../domain/model/task";
import { StepsRepository } from "../../domain/ports/steps.repository";
import { TasksRepository } from "../../domain/ports/tasks.repository";

export class StartStepCommand {
    constructor(public readonly taskId: TaskId, public readonly stepId: StepId) { }
}

export class StartStepCommandHandler {
    constructor(private readonly taskRepository: TasksRepository, private readonly stepsRepository: StepsRepository) { }

    async execute(command: StartStepCommand) {
        const task = await this.taskRepository.findById(command.taskId);
        if (task === null) {
            throw new Error("Task not found");
        }

        const step = await this.stepsRepository.findById(command.stepId);
        if (step === null) {
            throw new Error("Step not found");
        }

        task.start(command.stepId);
        await this.taskRepository.save(task);
    }
}