import { Step, StepId } from "../model/steps";

export interface StepsRepository {
  save(step: Step): Promise<void>;
  getLibrary(): Promise<Step[]>;
  findById(stepId: StepId): Promise<Step | null>;
  findByIds(stepIds: StepId[]): Promise<Record<StepId, Step | null>>;
}
