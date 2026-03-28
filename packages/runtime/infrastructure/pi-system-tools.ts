import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
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
import type { AgentSkillAccess } from "../domain/ports/agent-runtime.js";

type AnyToolDefinition = ToolDefinition<any, any, any>;

interface ResolvedAgentSkill extends AgentSkillAccess {
  rootDir: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureWorkspacePath(rootDir: string, requestedPath: string): string {
  const absoluteRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(absoluteRoot, requestedPath);
  const relative = path.relative(absoluteRoot, resolvedTarget);
  const normalizedRelative = relative.split(path.sep).join("/");

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the workspace root: ${requestedPath}`);
  }

  if (
    normalizedRelative === ".hisse/skills" ||
    normalizedRelative.startsWith(".hisse/skills/")
  ) {
    throw new Error(
      "Skills are protected workspace resources. Use ListAgentSkills, ReadAgentSkill, or ReadAgentSkillFile instead.",
    );
  }

  if (normalizedRelative === ".hisse" || normalizedRelative.startsWith(".hisse/")) {
    throw new Error(`Path is inside the protected .hisse directory: ${requestedPath}`);
  }

  return resolvedTarget;
}

function ensureSkillPath(skillRootDir: string, requestedPath: string): string {
  const absoluteRoot = path.resolve(skillRootDir);
  const resolvedTarget = path.resolve(absoluteRoot, requestedPath);
  const relative = path.relative(absoluteRoot, resolvedTarget);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the skill root: ${requestedPath}`);
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

const readAgentSkillSchema = Type.Object({
  name: Type.String({ description: "Exact skill name returned by ListAgentSkills" }),
});

const readAgentSkillFileSchema = Type.Object({
  name: Type.String({ description: "Exact skill name returned by ListAgentSkills" }),
  path: Type.String({ description: "Relative path inside the selected skill" }),
});

type AppendToolInput = Static<typeof appendSchema>;
type ReadAgentSkillToolInput = Static<typeof readAgentSkillSchema>;
type ReadAgentSkillFileToolInput = Static<typeof readAgentSkillFileSchema>;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveAgentSkill(
  skillsBaseDir: string,
  skills: AgentSkillAccess[],
  skillName: string,
): Promise<ResolvedAgentSkill> {
  const skill = skills.find((candidate) => candidate.name.toLowerCase() === skillName.toLowerCase());
  if (!skill) {
    const available = skills.map((candidate) => candidate.name).sort();
    throw new Error(
      `Skill "${skillName}" is not available for this agent. Available skills: ${available.join(", ") || "none"}.`,
    );
  }

  const preferredRoot = path.join(skillsBaseDir, slugify(skill.name));
  const preferredMetaPath = path.join(preferredRoot, "skill.json");
  if (await fileExists(preferredMetaPath)) {
    try {
      const meta = JSON.parse(await readFile(preferredMetaPath, "utf-8")) as { id?: string };
      if (meta.id === skill.id) {
        return { ...skill, rootDir: preferredRoot };
      }
    } catch {
      // Fall back to directory scan.
    }
  }

  try {
    const dirents = await readdir(skillsBaseDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dirent.isDirectory()) {
        continue;
      }

      const rootDir = path.join(skillsBaseDir, dirent.name);
      const metaPath = path.join(rootDir, "skill.json");
      if (!(await fileExists(metaPath))) {
        continue;
      }

      try {
        const meta = JSON.parse(await readFile(metaPath, "utf-8")) as { id?: string };
        if (meta.id === skill.id) {
          return { ...skill, rootDir };
        }
      } catch {
        // Ignore malformed entries while scanning.
      }
    }
  } catch {
    // Ignore scan errors and fall through to the final error.
  }

  throw new Error(`Skill "${skill.name}" exists in metadata but its files could not be found.`);
}

async function collectSkillTreeEntries(
  currentDir: string,
  rootDir: string,
  entries: string[],
  limit: number,
): Promise<void> {
  if (entries.length >= limit) {
    return;
  }

  const dirents = await readdir(currentDir, { withFileTypes: true });
  dirents.sort((left, right) => left.name.localeCompare(right.name));

  for (const dirent of dirents) {
    if (entries.length >= limit) {
      return;
    }

    const absolutePath = path.join(currentDir, dirent.name);
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
    const label = dirent.isDirectory() ? `${relativePath}/` : relativePath;
    entries.push(label);

    if (dirent.isDirectory()) {
      await collectSkillTreeEntries(absolutePath, rootDir, entries, limit);
    }
  }
}

async function buildSkillFileTree(rootDir: string, limit = 200): Promise<string[]> {
  const entries: string[] = [];
  await collectSkillTreeEntries(rootDir, rootDir, entries, limit);
  return entries;
}

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

function createListAgentSkillsToolDefinition(skills: AgentSkillAccess[]): ToolDefinition<any> {
  return {
    name: "ListAgentSkills",
    label: "List agent skills",
    description: "List the skills explicitly linked to the current agent.",
    promptSnippet: "List the skills available to the current agent",
    promptGuidelines: [
      "Use this before trying to inspect or apply an agent skill.",
      "Only the returned skills are available to the current agent.",
    ],
    parameters: Type.Object({}),
    async execute() {
      if (skills.length === 0) {
        return {
          content: [{ type: "text", text: "This agent has no linked skills." }],
          details: undefined,
        };
      }

      const lines = skills
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((skill) => `- ${skill.name}: ${skill.description}`);

      return {
        content: [{ type: "text", text: `Available agent skills:\n${lines.join("\n")}` }],
        details: undefined,
      };
    },
  };
}

function createReadAgentSkillToolDefinition(
  skillsBaseDir: string,
  skills: AgentSkillAccess[],
): ToolDefinition<typeof readAgentSkillSchema> {
  return {
    name: "ReadAgentSkill",
    label: "Read agent skill",
    description: "Read a linked agent skill entry point and inspect its full file tree.",
    promptSnippet: "Read a linked agent skill and inspect its supporting files",
    promptGuidelines: [
      "Use this when the user invoked a specific skill or when a skill might help.",
      "Read the skill before trying to inspect files under .hisse/skills.",
      "Use ReadAgentSkillFile for supporting files mentioned by the skill.",
    ],
    parameters: readAgentSkillSchema,
    async execute(_toolCallId, params: ReadAgentSkillToolInput) {
      const skill = await resolveAgentSkill(skillsBaseDir, skills, params.name);
      const entryFilePath = ensureSkillPath(skill.rootDir, "SKILL.md");
      const skillContent = await readFile(entryFilePath, "utf-8");
      const tree = await buildSkillFileTree(skill.rootDir);
      const treeLines = tree.length > 0 ? tree.map((entry) => `- ${entry}`).join("\n") : "- SKILL.md";

      const text = [
        `Skill: ${skill.name}`,
        `Description: ${skill.description}`,
        "",
        "Files:",
        treeLines,
        "",
        "Entry file (SKILL.md):",
        skillContent,
        "",
        "Use ReadAgentSkillFile to inspect any supporting file listed above.",
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        details: undefined,
      };
    },
  };
}

function createReadAgentSkillFileToolDefinition(
  skillsBaseDir: string,
  skills: AgentSkillAccess[],
): ToolDefinition<typeof readAgentSkillFileSchema> {
  return {
    name: "ReadAgentSkillFile",
    label: "Read agent skill file",
    description: "Read a supporting file inside one of the current agent's linked skills.",
    promptSnippet: "Read a supporting file from an agent skill",
    promptGuidelines: [
      "Use this after ReadAgentSkill when the skill references supporting files.",
      "The path must stay inside the selected skill package.",
    ],
    parameters: readAgentSkillFileSchema,
    async execute(_toolCallId, params: ReadAgentSkillFileToolInput) {
      const skill = await resolveAgentSkill(skillsBaseDir, skills, params.name);
      const absolutePath = ensureSkillPath(skill.rootDir, params.path);
      const content = await readFile(absolutePath, "utf-8");
      const relativePath = path.relative(skill.rootDir, absolutePath).split(path.sep).join("/");

      return {
        content: [{ type: "text", text: `# ${skill.name}/${relativePath}\n\n${content}` }],
        details: undefined,
      };
    },
  };
}

export function createPiSystemTools(
  rootDir: string,
  skillsBaseDir: string,
  skills: AgentSkillAccess[],
): AnyToolDefinition[] {
  const read = wrapWorkspacePathTool(createReadToolDefinition(rootDir), rootDir, (params) => params.path);
  const grep = wrapWorkspacePathTool(createGrepToolDefinition(rootDir), rootDir, (params) => params.path);
  const find = wrapWorkspacePathTool(createFindToolDefinition(rootDir), rootDir, (params) => params.path);
  const ls = wrapWorkspacePathTool(createLsToolDefinition(rootDir), rootDir, (params) => params.path);
  const edit = wrapWorkspacePathTool(createEditToolDefinition(rootDir), rootDir, (params) => params.path);
  const write = wrapWorkspacePathTool(createWriteToolDefinition(rootDir), rootDir, (params) => params.path);
  const append = createAppendToolDefinition(rootDir);
  const listAgentSkills = createListAgentSkillsToolDefinition(skills);
  const readAgentSkill = createReadAgentSkillToolDefinition(skillsBaseDir, skills);
  const readAgentSkillFile = createReadAgentSkillFileToolDefinition(skillsBaseDir, skills);

  return [
    read,
    grep,
    find,
    ls,
    edit,
    write,
    append,
    listAgentSkills,
    readAgentSkill,
    readAgentSkillFile,
  ];
}
