import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import {
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  type ToolDefinition,
} from "@mariozechner/pi-coding-agent";

type AnyToolDefinition = ToolDefinition<any, any, any>;

function ensureWorkspacePath(rootDir: string, requestedPath: string): string {
  const absoluteRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(absoluteRoot, requestedPath);
  const relative = path.relative(absoluteRoot, resolvedTarget);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the workspace root: ${requestedPath}`);
  }

  if (relative === ".hisse" || relative.startsWith(`.hisse${path.sep}`)) {
    throw new Error(`Path is inside the protected .hisse directory: ${requestedPath}`);
  }

  return resolvedTarget;
}

function wrapWorkspacePathTool(
  definition: AnyToolDefinition,
  rootDir: string,
  getPath: (params: any) => string | undefined,
): AnyToolDefinition {
  return {
    ...definition,
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const requestedPath = getPath(params);
      if (requestedPath) {
        ensureWorkspacePath(rootDir, requestedPath);
      }

      return definition.execute(toolCallId, params, signal, onUpdate, ctx);
    },
  };
}

const appendSchema = Type.Object({
  path: Type.String({ description: "Path to the file to append to (relative to the workspace root)" }),
  content: Type.String({ description: "Content to append" }),
});

type AppendToolInput = Static<typeof appendSchema>;

function createAppendToolDefinition(rootDir: string): ToolDefinition<typeof appendSchema> {
  return {
    name: "append",
    label: "append",
    description: "Append content to the end of a file. Creates the file and parent directories if needed.",
    promptSnippet: "Append content to the end of files",
    promptGuidelines: [
      "Use append for adding content at the end of a file.",
      "Use edit for surgical changes and write for complete rewrites.",
    ],
    parameters: appendSchema,
    async execute(_toolCallId, params: AppendToolInput, signal) {
      const absolutePath = ensureWorkspacePath(rootDir, params.path);

      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      await mkdir(path.dirname(absolutePath), { recursive: true });

      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      await appendFile(absolutePath, params.content, "utf-8");

      return {
        content: [{ type: "text", text: `Successfully appended ${params.content.length} bytes to ${params.path}` }],
        details: undefined,
      };
    },
  };
}

export function createPiSystemTools(rootDir: string): AnyToolDefinition[] {
  const read = wrapWorkspacePathTool(createReadToolDefinition(rootDir), rootDir, (params) => params.path);
  const grep = wrapWorkspacePathTool(createGrepToolDefinition(rootDir), rootDir, (params) => params.path);
  const find = wrapWorkspacePathTool(createFindToolDefinition(rootDir), rootDir, (params) => params.path);
  const ls = wrapWorkspacePathTool(createLsToolDefinition(rootDir), rootDir, (params) => params.path);
  const edit = wrapWorkspacePathTool(createEditToolDefinition(rootDir), rootDir, (params) => params.path);
  const write = wrapWorkspacePathTool(createWriteToolDefinition(rootDir), rootDir, (params) => params.path);
  const append = createAppendToolDefinition(rootDir);

  return [read, grep, find, ls, edit, write, append];
}
