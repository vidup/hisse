import { exec as execCb } from "node:child_process";
import { readFile, writeFile, readdir, access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { StepExecutionContext } from "../domain/model/step-execution-context.js";
import type { StepInputRequest } from "../domain/model/task.js";
import type { StepExecutionInput, StepExecutionResult, StepExecutor } from "../domain/ports/step-executor.port.js";

const execAsync = promisify(execCb);

export class TsStepExecutor implements StepExecutor {
  async execute(input: StepExecutionInput): Promise<StepExecutionResult> {
    let result: StepExecutionResult = { outcome: "completed" };
    let flowControlCalled = false;

    function setResult(r: StepExecutionResult) {
      if (flowControlCalled) return; // first call wins
      flowControlCalled = true;
      result = r;
    }

    const context: StepExecutionContext = {
      task: input.task,
      step: input.step,
      paths: input.paths,

      // Flow control
      complete() {
        setResult({ outcome: "completed" });
      },
      fail(reason: string) {
        setResult({ outcome: "failed", failureReason: reason });
      },
      moveToPreviousStep(annotation: string) {
        setResult({ outcome: "move_to_previous", annotation });
      },
      waitForInput(request: StepInputRequest) {
        setResult({ outcome: "waiting_for_input", inputRequest: request });
      },

      // Shell execution
      async exec(command: string, options?: { cwd?: string }) {
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: options?.cwd ?? input.paths.workspace,
            timeout: 60_000,
          });
          return { stdout, stderr, exitCode: 0 };
        } catch (err: unknown) {
          const e = err as { stdout?: string; stderr?: string; code?: number };
          return {
            stdout: e.stdout ?? "",
            stderr: e.stderr ?? (err instanceof Error ? err.message : String(err)),
            exitCode: e.code ?? 1,
          };
        }
      },

      // Filesystem tools
      async readFile(filePath: string) {
        return readFile(filePath, "utf-8");
      },
      async writeFile(filePath: string, content: string) {
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content, "utf-8");
      },
      async fileExists(filePath: string) {
        try {
          await access(filePath);
          return true;
        } catch {
          return false;
        }
      },
      async listFiles(dir: string) {
        try {
          const entries = await readdir(dir);
          return entries;
        } catch {
          return [];
        }
      },

      // Artifact management
      async addFileToTask(filePath: string) {
        const fileName = path.basename(filePath);
        const dest = path.join(input.paths.tasks, input.task.id, fileName);
        await mkdir(path.dirname(dest), { recursive: true });
        await copyFile(filePath, dest);
      },
      async addFileToProject(filePath: string) {
        const fileName = path.basename(filePath);
        const dest = path.join(input.paths.project, fileName);
        await copyFile(filePath, dest);
      },
    };

    try {
      const mod = await import(pathToFileURL(input.codePath).href);
      const fn = mod.default;
      if (typeof fn !== "function") {
        return { outcome: "failed", failureReason: `No default export function in ${input.codePath}` };
      }
      await fn(context);
    } catch (err) {
      if (!flowControlCalled) {
        return { outcome: "failed", failureReason: err instanceof Error ? err.message : String(err) };
      }
    }

    return result;
  }
}
