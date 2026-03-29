import type { StepInputRequest } from "../model/task";

export interface StepExecutionInput {
  codePath: string;
  task: { id: string; name: string; description: string; projectId: string };
  step: { id: string; name: string; description: string };
  paths: { workspace: string; project: string; tasks: string };
}

export type StepExecutionOutcome = "completed" | "failed" | "waiting_for_input" | "move_to_previous";

export interface StepExecutionResult {
  outcome: StepExecutionOutcome;
  failureReason?: string;
  annotation?: string;
  inputRequest?: StepInputRequest;
}

export interface StepExecutor {
  execute(input: StepExecutionInput): Promise<StepExecutionResult>;
}
