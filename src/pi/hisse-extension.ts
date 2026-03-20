import { constants } from "node:fs";
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

import type {
  ExtensionAPI,
  ExtensionContext,
  SessionEntry,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import {
  ProjectCreatedEvent,
  StageChangedEvent,
  TaskAddedEvent,
  TaskStatusChangedEvent,
} from "../core/events";
import { STAGES, TASK_STATUSES, type ProjectState } from "../core/model";
import { reduceEvents } from "../core/reducer";
import { JsonlEventStore } from "../store/jsonl-event-store";

const ACTIVE_PROJECT_ENTRY = "hisse.active_project";

const PROJECT_ACTIONS = ["create", "open", "status", "list"] as const;
type ProjectAction = (typeof PROJECT_ACTIONS)[number];

const TASK_ACTIONS = ["add", "set_status", "list"] as const;
type TaskAction = (typeof TASK_ACTIONS)[number];

const STAGE_ACTIONS = ["advance", "status"] as const;
type StageAction = (typeof STAGE_ACTIONS)[number];

function enumStringField(values: readonly string[], description: string) {
  return Type.String({
    description: `${description}. Allowed values: ${values.join(", ")}`,
  });
}

function isOneOf<T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return (values as readonly string[]).includes(value);
}

function isValidProjectId(projectId: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(projectId);
}

function isCustomEntry(entry: SessionEntry): entry is SessionEntry & {
  type: "custom";
  customType: string;
  data?: unknown;
} {
  return entry.type === "custom";
}

function summarizeState(state: ProjectState): string {
  const tasks = Object.values(state.tasks);
  const done = tasks.filter((task) => task.status === "done").length;
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const inProgress = tasks.filter(
    (task) => task.status === "in_progress",
  ).length;

  return [
    `Project: ${state.projectId} (${state.name})`,
    `Stage: ${state.stage}`,
    `Tasks: ${tasks.length} total • ${done} done • ${inProgress} in_progress • ${blocked} blocked`,
  ].join("\n");
}

function formatTaskList(state: ProjectState): string {
  const tasks = Object.values(state.tasks);
  if (tasks.length === 0) return "No tasks yet.";
  const sorted = tasks.sort((a, b) => a.createdAt - b.createdAt);
  return sorted
    .map((task) => `- [${task.status}] ${task.id}: ${task.title}`)
    .join("\n");
}

function nextTaskId(state: ProjectState): string {
  const ids = Object.keys(state.tasks)
    .map((taskId) => /^t(\d+)$/.exec(taskId)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number.parseInt(value, 10));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return `t${maxId + 1}`;
}

async function loadProjectState(
  cwd: string,
  projectId: string,
): Promise<ProjectState | undefined> {
  const store = new JsonlEventStore(cwd, projectId);
  const events = await store.loadAll();
  if (events.length === 0) return undefined;
  return reduceEvents(events);
}

async function listProjectIds(cwd: string): Promise<string[]> {
  const root = join(cwd, ".hisse");
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const ids: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const eventsPath = join(root, entry.name, "events.jsonl");
      try {
        await access(eventsPath, constants.F_OK);
        ids.push(entry.name);
      } catch {
        // ignore dirs without events.jsonl
      }
    }
    return ids.sort();
  } catch {
    return [];
  }
}

export default function hisseExtension(pi: ExtensionAPI) {
  let activeProjectId: string | undefined;

  async function setActiveProject(
    projectId: string | undefined,
    ctx: ExtensionContext,
  ): Promise<void> {
    activeProjectId = projectId;
    pi.appendEntry(ACTIVE_PROJECT_ENTRY, {
      projectId: projectId ?? null,
      timestamp: Date.now(),
    });
    await refreshUi(ctx);
  }

  async function refreshUi(ctx: ExtensionContext): Promise<void> {
    if (!activeProjectId) {
      ctx.ui.setStatus("hisse", undefined);
      ctx.ui.setWidget("hisse", undefined);
      return;
    }

    const state = await loadProjectState(ctx.cwd, activeProjectId);
    if (!state) {
      ctx.ui.setStatus(
        "hisse",
        ctx.ui.theme.fg("warning", `hisse:${activeProjectId} (missing)`),
      );
      ctx.ui.setWidget("hisse", ["No events found for active project."]);
      return;
    }

    const tasks = Object.values(state.tasks);
    const done = tasks.filter((task) => task.status === "done").length;
    ctx.ui.setStatus(
      "hisse",
      ctx.ui.theme.fg("accent", `hisse:${state.projectId} • ${state.stage}`),
    );
    ctx.ui.setWidget("hisse", [
      `project: ${state.projectId} (${state.name})`,
      `stage: ${state.stage}`,
      `tasks: ${done}/${tasks.length} done`,
    ]);
  }

  function restoreActiveProject(ctx: ExtensionContext): string | undefined {
    let restored: string | undefined;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (!isCustomEntry(entry) || entry.customType !== ACTIVE_PROJECT_ENTRY)
        continue;
      const data = entry.data as { projectId?: unknown } | undefined;
      if (data?.projectId === null) {
        restored = undefined;
        continue;
      }
      if (typeof data?.projectId === "string") {
        restored = data.projectId;
      }
    }
    return restored;
  }

  async function requireProjectId(
    projectId: string | undefined,
    ctx: ExtensionContext,
  ): Promise<string> {
    const resolved = projectId ?? activeProjectId;
    if (!resolved) {
      throw new Error(
        "No active project. Use hisse_project with action=create/open first.",
      );
    }
    const state = await loadProjectState(ctx.cwd, resolved);
    if (!state) {
      throw new Error(`Project not found: ${resolved}`);
    }
    return resolved;
  }

  pi.on("session_start", async (_event, ctx) => {
    activeProjectId = restoreActiveProject(ctx);
    await refreshUi(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    activeProjectId = restoreActiveProject(ctx);
    await refreshUi(ctx);
  });

  pi.on("session_fork", async (_event, ctx) => {
    activeProjectId = restoreActiveProject(ctx);
    await refreshUi(ctx);
  });

  pi.on("session_tree", async (_event, ctx) => {
    activeProjectId = restoreActiveProject(ctx);
    await refreshUi(ctx);
  });

  pi.registerCommand("hisse", {
    description: "Show hisse status and active project",
    handler: async (_args, ctx) => {
      if (!activeProjectId) {
        ctx.ui.notify(
          "No active project. Use tool hisse_project(action=create/open).",
          "info",
        );
        return;
      }
      const state = await loadProjectState(ctx.cwd, activeProjectId);
      if (!state) {
        ctx.ui.notify(
          `Active project '${activeProjectId}' not found on disk.`,
          "warning",
        );
        return;
      }
      ctx.ui.notify(`\n${summarizeState(state)}`, "info");
    },
  });

  pi.registerTool({
    name: "hisse_project",
    label: "Hisse Project",
    description: "Create/open/list projects and inspect project status",
    promptSnippet:
      "Manage hisse projects (create/open/status/list) with persisted state.",
    promptGuidelines: [
      "Use hisse_project to create/open a project before calling other hisse tools.",
      "Keep projectId lowercase (letters, numbers, _ or -).",
    ],
    parameters: Type.Object({
      action: enumStringField(PROJECT_ACTIONS, "Project action"),
      projectId: Type.Optional(
        Type.String({ description: "Project identifier" }),
      ),
      name: Type.Optional(
        Type.String({ description: "Display name (used by create)" }),
      ),
      initialStage: Type.Optional(enumStringField(STAGES, "Initial stage")),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!isOneOf(PROJECT_ACTIONS, params.action)) {
        throw new Error(`Unsupported action: ${params.action}`);
      }
      const action: ProjectAction = params.action;

      if (action === "list") {
        const ids = await listProjectIds(ctx.cwd);
        return {
          content: [
            {
              type: "text",
              text: ids.length > 0 ? ids.join("\n") : "No projects found.",
            },
          ],
          details: { projectIds: ids },
        };
      }

      if (action === "create") {
        if (!params.projectId)
          throw new Error("projectId is required for action=create");
        if (!isValidProjectId(params.projectId)) {
          throw new Error(
            "Invalid projectId. Use lowercase letters, numbers, '_' or '-'.",
          );
        }
        const store = new JsonlEventStore(ctx.cwd, params.projectId);
        const existing = await store.loadAll();
        if (existing.length > 0) {
          throw new Error(`Project already exists: ${params.projectId}`);
        }

        const initialStage = params.initialStage ?? "backlog";
        if (!isOneOf(STAGES, initialStage)) {
          throw new Error(`Invalid initialStage: ${initialStage}`);
        }

        const event = new ProjectCreatedEvent(
          params.projectId,
          params.name ?? params.projectId,
          initialStage,
        );
        await store.append(event);
        await setActiveProject(params.projectId, ctx);

        const state = await loadProjectState(ctx.cwd, params.projectId);
        return {
          content: [
            {
              type: "text",
              text: state
                ? summarizeState(state)
                : `Created ${params.projectId}`,
            },
          ],
          details: { action, projectId: params.projectId },
        };
      }

      if (action === "open") {
        if (!params.projectId)
          throw new Error("projectId is required for action=open");
        const state = await loadProjectState(ctx.cwd, params.projectId);
        if (!state) throw new Error(`Project not found: ${params.projectId}`);
        await setActiveProject(params.projectId, ctx);
        return {
          content: [{ type: "text", text: summarizeState(state) }],
          details: { action, projectId: params.projectId },
        };
      }

      if (action === "status") {
        const projectId = await requireProjectId(params.projectId, ctx);
        const state = await loadProjectState(ctx.cwd, projectId);
        if (!state) throw new Error(`Project not found: ${projectId}`);
        await refreshUi(ctx);
        return {
          content: [{ type: "text", text: summarizeState(state) }],
          details: { action, projectId },
        };
      }

      throw new Error(`Unsupported action: ${String(action)}`);
    },
  });

  pi.registerTool({
    name: "hisse_task",
    label: "Hisse Task",
    description: "Manage tasks in the active hisse project",
    promptSnippet:
      "Manage tasks (add/set_status/list) for the active hisse project.",
    parameters: Type.Object({
      action: enumStringField(TASK_ACTIONS, "Task action"),
      projectId: Type.Optional(
        Type.String({
          description: "Project identifier (defaults to active project)",
        }),
      ),
      taskId: Type.Optional(Type.String({ description: "Task identifier" })),
      title: Type.Optional(
        Type.String({ description: "Task title (for add)" }),
      ),
      status: Type.Optional(enumStringField(TASK_STATUSES, "Task status")),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!isOneOf(TASK_ACTIONS, params.action)) {
        throw new Error(`Unsupported action: ${params.action}`);
      }
      const action: TaskAction = params.action;
      const projectId = await requireProjectId(params.projectId, ctx);
      const store = new JsonlEventStore(ctx.cwd, projectId);
      const state = await loadProjectState(ctx.cwd, projectId);
      if (!state) throw new Error(`Project not found: ${projectId}`);

      if (action === "list") {
        return {
          content: [{ type: "text", text: formatTaskList(state) }],
          details: {
            action,
            projectId,
            taskCount: Object.keys(state.tasks).length,
          },
        };
      }

      if (action === "add") {
        if (!params.title) throw new Error("title is required for action=add");
        const taskId = params.taskId ?? nextTaskId(state);
        if (state.tasks[taskId])
          throw new Error(`Task already exists: ${taskId}`);

        await store.append(new TaskAddedEvent(projectId, taskId, params.title));
        if (projectId === activeProjectId) await refreshUi(ctx);

        const nextState = await loadProjectState(ctx.cwd, projectId);
        return {
          content: [
            {
              type: "text",
              text: nextState
                ? formatTaskList(nextState)
                : `Added task ${taskId}`,
            },
          ],
          details: { action, projectId, taskId },
        };
      }

      if (action === "set_status") {
        if (!params.taskId)
          throw new Error("taskId is required for action=set_status");
        if (!params.status)
          throw new Error("status is required for action=set_status");
        if (!isOneOf(TASK_STATUSES, params.status)) {
          throw new Error(`Invalid task status: ${params.status}`);
        }
        const task = state.tasks[params.taskId];
        if (!task) throw new Error(`Task not found: ${params.taskId}`);
        if (task.status === params.status) {
          return {
            content: [
              {
                type: "text",
                text: `Task ${task.id} is already ${task.status}.`,
              },
            ],
            details: { action, projectId, taskId: task.id },
          };
        }
        await store.append(
          new TaskStatusChangedEvent(
            projectId,
            task.id,
            task.status,
            params.status,
          ),
        );
        if (projectId === activeProjectId) await refreshUi(ctx);

        const nextState = await loadProjectState(ctx.cwd, projectId);
        return {
          content: [
            {
              type: "text",
              text: nextState
                ? formatTaskList(nextState)
                : `Updated ${task.id}`,
            },
          ],
          details: {
            action,
            projectId,
            taskId: task.id,
            toStatus: params.status,
          },
        };
      }

      throw new Error(`Unsupported action: ${String(action)}`);
    },
  });

  pi.registerTool({
    name: "hisse_stage",
    label: "Hisse Stage",
    description: "Advance project stage using deterministic transition rules",
    promptSnippet:
      "Advance stage (or read stage status) on the active hisse project.",
    parameters: Type.Object({
      action: enumStringField(STAGE_ACTIONS, "Stage action"),
      projectId: Type.Optional(
        Type.String({
          description: "Project identifier (defaults to active project)",
        }),
      ),
      toStage: Type.Optional(enumStringField(STAGES, "Target stage")),
      reason: Type.Optional(
        Type.String({ description: "Optional transition reason" }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!isOneOf(STAGE_ACTIONS, params.action)) {
        throw new Error(`Unsupported action: ${params.action}`);
      }
      const action: StageAction = params.action;
      const projectId = await requireProjectId(params.projectId, ctx);
      const store = new JsonlEventStore(ctx.cwd, projectId);
      const state = await loadProjectState(ctx.cwd, projectId);
      if (!state || !state.stage)
        throw new Error(`Project not found: ${projectId}`);

      if (action === "status") {
        return {
          content: [{ type: "text", text: summarizeState(state) }],
          details: { action, projectId, stage: state.stage },
        };
      }

      if (!params.toStage)
        throw new Error("toStage is required for action=advance");
      if (!isOneOf(STAGES, params.toStage)) {
        throw new Error(`Invalid target stage: ${params.toStage}`);
      }
      if (params.toStage === state.stage) {
        return {
          content: [
            { type: "text", text: `Project already in stage ${state.stage}.` },
          ],
          details: { action, projectId, stage: state.stage },
        };
      }

      await store.append(
        new StageChangedEvent(
          projectId,
          state.stage,
          params.toStage,
          params.reason,
        ),
      );
      if (projectId === activeProjectId) await refreshUi(ctx);

      const nextState = await loadProjectState(ctx.cwd, projectId);
      return {
        content: [
          {
            type: "text",
            text: nextState
              ? summarizeState(nextState)
              : `Stage updated to ${params.toStage}`,
          },
        ],
        details: { action, projectId, toStage: params.toStage },
      };
    },
  });
}
