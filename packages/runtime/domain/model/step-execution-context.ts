import type { StepInputRequest } from "./task";

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

  // Flow control — the step function must call exactly one of these
  complete(): void;
  fail(reason: string): void;
  moveToPreviousStep(annotation: string): void;
  waitForInput(request: StepInputRequest): void;

  // Shell execution — cwd defaults to workspace root
  exec(command: string, options?: { cwd?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }>;

  // Filesystem tools
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  listFiles(dir: string): Promise<string[]>;

  // Artifact management
  addFileToTask(filePath: string): Promise<void>;
  addFileToProject(filePath: string): Promise<void>;
}
