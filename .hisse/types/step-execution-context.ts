export interface StepInputQuestion {
  id: string;
  label: string;
  type: "yes_no" | "single_select" | "multi_select" | "scale";
  description?: string;
  options?: Array<{ id: string; label: string }>;
  range?: { min: number; max: number; step?: number; unit?: string };
}

export interface StepInputRequest {
  title?: string;
  instructions?: string;
  questions: StepInputQuestion[];
}

export interface StepExecutionContext {
  task: { id: string; name: string; description: string; projectId: string };
  step: { id: string; name: string; description: string };
  paths: {
    /** The workspace root directory */
    workspace: string;
    /** The project directory (.hisse/projects/{slug}/) */
    project: string;
    /** The tasks directory (.hisse/projects/{slug}/tasks/) */
    tasks: string;
  };

  // Flow control — call exactly one of these 4
  complete(): void;
  fail(reason: string): void;
  moveToPreviousStep(annotation: string): void;
  waitForInput(request: StepInputRequest): void;

  // Shell execution — cwd defaults to workspace root
  exec(command: string, options?: { cwd?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }>;

  // Filesystem
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  listFiles(dir: string): Promise<string[]>;

  // Artifact management
  addFileToTask(filePath: string): Promise<void>;
  addFileToProject(filePath: string): Promise<void>;
}
