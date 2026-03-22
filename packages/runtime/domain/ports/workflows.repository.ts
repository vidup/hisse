import type { Workflow } from "../model/workflow";
import type { WorkflowId } from "../model/workflow";

export interface WorkflowsRepository {
  save(workflow: Workflow): Promise<void>;
  findById(workflowId: WorkflowId): Promise<Workflow | null>;
  findAll(): Promise<Workflow[]>;
}
