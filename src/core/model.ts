export const STAGES = [
  "backlog",
  "brainstorming",
  "prd",
  "srs",
  "shaping",
  "executing",
  "verifying",
  "shipped",
] as const;
export type Stage = (typeof STAGES)[number];

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "blocked",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectState {
  projectId: string | null;
  name: string | null;
  stage: Stage | null;
  tasks: Record<string, Task>;
  createdAt: number | null;
  updatedAt: number | null;
}

export const initialProjectState: ProjectState = {
  projectId: null,
  name: null,
  stage: null,
  tasks: {},
  createdAt: null,
  updatedAt: null,
};

type StageMapping = Record<Stage, Stage[]>;

const DEFAULT_STAGE_TRANSITIONS: StageMapping = {
  backlog: [
    // Allows to start at any stage if you already have documents ready.
    "brainstorming",
    "prd",
    "srs",
    "shaping",
    "executing",
    "verifying",
    "shipped",
  ],
  brainstorming: ["prd"],
  prd: ["srs"],
  srs: ["shaping"],
  shaping: ["executing"],
  executing: ["verifying"],
  verifying: ["shipped"],
  shipped: [],
};

// Later: add possibility to override the default stage transitions for a project.
export function canTransitionStage(from: Stage, to: Stage): boolean {
  return DEFAULT_STAGE_TRANSITIONS[from].includes(to);
}
