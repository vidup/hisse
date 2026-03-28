import path from "node:path";
import {
  createAgentSession,
  AuthStorage,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  InMemoryAuthStorageBackend,
  type AuthCredential,
  type CreateAgentSessionResult,
  type AgentSessionEvent,
} from "@mariozechner/pi-coding-agent";
import type {
  AgentRuntime,
  AgentSessionHandle,
  AgentStreamEvent,
  AgentMessage,
  AgentSkillAccess,
} from "../domain/ports/agent-runtime.js";
import {
  createQuestionnaireArtifact,
  type ConversationActivity,
  type ConversationPlan,
  type ConversationQuestionDefinitionInput,
} from "../domain/model/message.js";
import { createPiSystemTools } from "./pi-system-tools.js";

export interface CredentialEntry {
  provider: string;
  method: "api_key" | "oauth";
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

function summarizeToolLabel(toolName: string, args: Record<string, unknown> | undefined): string {
  const path = typeof args?.path === "string" ? args.path : undefined;
  const pattern = typeof args?.pattern === "string" ? args.pattern : undefined;

  switch (toolName) {
    case "read":
      return `Read ${path ?? "file"}`;
    case "write":
      return `Write ${path ?? "file"}`;
    case "append":
      return `Append ${path ?? "file"}`;
    case "edit":
      return `Edit ${path ?? "file"}`;
    case "ls":
      return `List ${path ?? "."}`;
    case "find":
      return pattern ? `Find ${pattern}${path ? ` in ${path}` : ""}` : `Find in ${path ?? "."}`;
    case "grep":
      return pattern ? `Search ${JSON.stringify(pattern)}${path ? ` in ${path}` : ""}` : `Search ${path ?? "."}`;
    case "ListAgentSkills":
      return "List linked agent skills";
    case "ReadAgentSkill":
      return `Read skill ${typeof args?.name === "string" ? args.name : ""}`.trim();
    case "ReadAgentSkillFile":
      return `Read skill file ${typeof args?.path === "string" ? args.path : ""}`.trim();
    case "UpdatePlan":
      return "Update visible plan";
    default:
      return toolName;
  }
}

function parsePlan(args: unknown): ConversationPlan | undefined {
  if (!args || typeof args !== "object") {
    return undefined;
  }

  const rawSteps = (args as { steps?: unknown }).steps;
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    return undefined;
  }

  const steps = rawSteps
    .map((step) => {
      if (!step || typeof step !== "object") {
        return null;
      }

      const candidate = step as {
        id?: unknown;
        label?: unknown;
        status?: unknown;
      };

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.label !== "string" ||
        (candidate.status !== "pending" &&
          candidate.status !== "in_progress" &&
          candidate.status !== "completed")
      ) {
        return null;
      }

      const status = candidate.status as "pending" | "in_progress" | "completed";

      return {
        id: candidate.id,
        label: candidate.label,
        status,
      };
    })
    .filter((step): step is NonNullable<typeof step> => !!step);

  if (steps.length === 0) {
    return undefined;
  }

  return {
    steps,
    updatedAt: new Date(),
  };
}

function parseQuestionnaireArtifact(toolCallId: string, args: unknown) {
  if (!args || typeof args !== "object") {
    return undefined;
  }

  const candidate = args as {
    title?: unknown;
    instructions?: unknown;
    questions?: unknown;
  };

  if (!Array.isArray(candidate.questions)) {
    return undefined;
  }

  const questions: ConversationQuestionDefinitionInput[] = [];

  for (const question of candidate.questions) {
    const normalizedQuestion = (() => {
      if (!question || typeof question !== "object") {
        return null;
      }

      const questionCandidate = question as {
        id?: unknown;
        label?: unknown;
        description?: unknown;
        type?: unknown;
        options?: unknown;
        range?: unknown;
      };

      if (
        typeof questionCandidate.id !== "string" ||
        typeof questionCandidate.label !== "string" ||
        (questionCandidate.type !== "yes_no" &&
          questionCandidate.type !== "single_select" &&
          questionCandidate.type !== "multi_select" &&
          questionCandidate.type !== "scale")
      ) {
        return null;
      }

      const options = Array.isArray(questionCandidate.options)
        ? questionCandidate.options
            .map((option) => {
              if (!option || typeof option !== "object") {
                return null;
              }

              const optionCandidate = option as { id?: unknown; label?: unknown };
              if (
                typeof optionCandidate.id !== "string" ||
                typeof optionCandidate.label !== "string"
              ) {
                return null;
              }

              return {
                id: optionCandidate.id,
                label: optionCandidate.label,
              };
            })
            .filter((option): option is NonNullable<typeof option> => !!option)
        : undefined;

      if (Array.isArray(questionCandidate.options) && options?.length !== questionCandidate.options.length) {
        return null;
      }

      const parseScaleRange = () => {
        if (!questionCandidate.range || typeof questionCandidate.range !== "object") {
          return null;
        }

        const rangeCandidate = questionCandidate.range as {
          min?: unknown;
          max?: unknown;
          step?: unknown;
          unit?: unknown;
          marks?: unknown;
        };

        if (typeof rangeCandidate.min !== "number" || typeof rangeCandidate.max !== "number") {
          return null;
        }

        const marks = Array.isArray(rangeCandidate.marks)
          ? rangeCandidate.marks
              .map((mark) => {
                if (!mark || typeof mark !== "object") {
                  return null;
                }

                const markCandidate = mark as { value?: unknown; label?: unknown };
                if (typeof markCandidate.value !== "number") {
                  return null;
                }

                if (
                  markCandidate.label !== undefined &&
                  typeof markCandidate.label !== "string"
                ) {
                  return null;
                }

                return {
                  value: markCandidate.value,
                  label: markCandidate.label,
                };
              })
              .filter((mark): mark is NonNullable<typeof mark> => !!mark)
          : undefined;

        if (Array.isArray(rangeCandidate.marks) && marks?.length !== rangeCandidate.marks.length) {
          return null;
        }

        if (rangeCandidate.step !== undefined && typeof rangeCandidate.step !== "number") {
          return null;
        }

        if (rangeCandidate.unit !== undefined && typeof rangeCandidate.unit !== "string") {
          return null;
        }

        return {
          min: rangeCandidate.min,
          max: rangeCandidate.max,
          step: rangeCandidate.step,
          unit: rangeCandidate.unit,
          marks,
        };
      }

      if (questionCandidate.type === "scale") {
        const range = parseScaleRange();
        if (!range) {
          return null;
        }

        return {
          id: questionCandidate.id,
          label: questionCandidate.label,
          description:
            typeof questionCandidate.description === "string"
              ? questionCandidate.description
              : undefined,
          type: questionCandidate.type,
          options,
          range,
        } satisfies ConversationQuestionDefinitionInput;
      }

      return {
        id: questionCandidate.id,
        label: questionCandidate.label,
        description:
          typeof questionCandidate.description === "string"
            ? questionCandidate.description
            : undefined,
        type: questionCandidate.type,
        options,
      } satisfies ConversationQuestionDefinitionInput;
    })();

    if (!normalizedQuestion) {
      return undefined;
    }

    questions.push(normalizedQuestion);
  }

  if (questions.length === 0) {
    return undefined;
  }

  try {
    return createQuestionnaireArtifact({
      id: toolCallId,
      title: typeof candidate.title === "string" ? candidate.title : undefined,
      instructions:
        typeof candidate.instructions === "string" ? candidate.instructions : undefined,
      questions,
    });
  } catch {
    return undefined;
  }
}

export class PiAgentRuntime implements AgentRuntime {
  private sessions = new Map<string, PiSessionHandle>();

  constructor(
    private readonly loadCredentials: () => Promise<CredentialEntry[]>,
    private readonly workspaceRoot: string,
    private readonly conversationsDir: string,
    private readonly skillsBaseDir: string,
  ) { }

  private async buildAuthAndRegistry() {
    const backend = new InMemoryAuthStorageBackend();
    const credentials = await this.loadCredentials();
    const data: Record<string, AuthCredential> = {};
    for (const cred of credentials) {
      if (cred.method === "api_key" && cred.apiKey) {
        data[cred.provider] = { type: "api_key", key: cred.apiKey };
      } else if (cred.method === "oauth" && cred.accessToken) {
        data[cred.provider] = { type: "api_key", key: cred.accessToken };
      }
    }
    backend.withLock(() => ({ result: undefined, next: JSON.stringify(data) }));
    const authStorage = AuthStorage.fromStorage(backend);
    const modelRegistry = new ModelRegistry(authStorage);
    return { authStorage, modelRegistry };
  }

  private sessionDir(sessionId: string): string {
    return path.join(this.conversationsDir, sessionId);
  }

  async createSession(params: {
    sessionId: string;
    systemPrompt: string;
    provider: string;
    model: string;
    availableSkills: AgentSkillAccess[];
  }): Promise<AgentSessionHandle> {
    const { authStorage, modelRegistry } = await this.buildAuthAndRegistry();
    const model = modelRegistry.find(params.provider, params.model);

    if (!model) {
      throw new Error(
        `Model "${params.provider}/${params.model}" not found in pi's model registry. ` +
        `Available: ${modelRegistry.getAll().map((m) => `${m.provider}/${m.id}`).join(", ")}`,
      );
    }

    // The agent works from the workspace root while Pi persists session JSONL per conversation.
    const cwd = this.workspaceRoot;
    const sessionDir = this.sessionDir(params.sessionId);
    console.log(`[pi] Creating session for workspace ${cwd} with session dir ${sessionDir}`);

    const sessionManager = SessionManager.create(cwd, sessionDir);
    const resourceLoader = new DefaultResourceLoader({
      cwd,
      appendSystemPrompt: params.systemPrompt,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
    });
    await resourceLoader.reload();

    const { session } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager,
      resourceLoader,
      model,
      tools: [],
      customTools: createPiSystemTools(cwd, this.skillsBaseDir, params.availableSkills),
    });

    const handle = new PiSessionHandle(session);
    this.sessions.set(params.sessionId, handle);
    return handle;
  }

  async resumeSession(params: {
    sessionId: string;
    systemPrompt: string;
    availableSkills: AgentSkillAccess[];
  }): Promise<AgentSessionHandle> {
    // Check in-memory cache first
    const cached = this.sessions.get(params.sessionId);
    if (cached) return cached;

    const { authStorage, modelRegistry } = await this.buildAuthAndRegistry();
    const cwd = this.workspaceRoot;
    const sessionDir = this.sessionDir(params.sessionId);
    console.log(`[pi] Resuming session for workspace ${cwd} with session dir ${sessionDir}`);

    const sessionManager = SessionManager.continueRecent(cwd, sessionDir);
    const resourceLoader = new DefaultResourceLoader({
      cwd,
      appendSystemPrompt: params.systemPrompt,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
    });
    await resourceLoader.reload();

    const { session } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager,
      resourceLoader,
      tools: [],
      customTools: createPiSystemTools(cwd, this.skillsBaseDir, params.availableSkills),
    });
    const handle = new PiSessionHandle(session);
    this.sessions.set(params.sessionId, handle);
    return handle;
  }
}

class PiSessionHandle implements AgentSessionHandle {
  constructor(
    private readonly session: CreateAgentSessionResult["session"],
  ) { }

  async *prompt(message: string): AsyncIterable<AgentStreamEvent> {
    let fullContent = "";
    let resolveNext: ((event: AgentStreamEvent | null) => void) | null = null;
    const queue: (AgentStreamEvent | null)[] = [];
    const activities = new Map<string, ConversationActivity>();
    let done = false;
    let failed = false;

    const unsubscribe = this.session.subscribe((event: AgentSessionEvent) => {
      if (event.type === "message_update") {
        const ame = (event as any).assistantMessageEvent;
        if (ame?.type === "text_delta") {
          fullContent += ame.delta;
          push({ type: "text_delta", content: ame.delta });
        }
      } else if (event.type === "tool_execution_start") {
        if (event.toolName === "UpdatePlan") {
          const plan = parsePlan(event.args);
          if (plan) {
            push({ type: "plan_update", plan });
          }
          return;
        }

        if (event.toolName === "AskUserQuestions") {
          const artifact = parseQuestionnaireArtifact(event.toolCallId, event.args);
          if (artifact) {
            push({ type: "artifact_update", artifact });
          }
          return;
        }

        const activity: ConversationActivity = {
          id: event.toolCallId,
          kind: "tool",
          name: event.toolName,
          label: summarizeToolLabel(event.toolName, event.args),
          status: "running",
          startedAt: new Date(),
        };
        activities.set(activity.id, activity);
        push({ type: "activity_start", activity });
      } else if (event.type === "tool_execution_update") {
        if (event.toolName === "UpdatePlan" || event.toolName === "AskUserQuestions") {
          return;
        }

        const existing = activities.get(event.toolCallId);
        if (existing) {
          push({ type: "activity_update", activity: existing });
        }
      } else if (event.type === "tool_execution_end") {
        if (event.toolName === "UpdatePlan" || event.toolName === "AskUserQuestions") {
          return;
        }

        const existing = activities.get(event.toolCallId);
        const activity: ConversationActivity = {
          id: event.toolCallId,
          kind: "tool",
          name: event.toolName,
          label: existing?.label ?? event.toolName,
          status: event.isError ? "failed" : "completed",
          startedAt: existing?.startedAt ?? new Date(),
          completedAt: new Date(),
        };
        activities.set(activity.id, activity);
        push({ type: "activity_end", activity });
      } else if (event.type === "agent_end") {
        push(null);
      }
    });

    function push(item: AgentStreamEvent | null) {
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r(item);
      } else {
        queue.push(item);
      }
    }

    const promptPromise = this.session.prompt(message, { expandPromptTemplates: false }).catch((err) => {
      failed = true;
      push({ type: "error", error: err instanceof Error ? err.message : String(err) });
      push(null);
    });

    try {
      while (!done) {
        const event: AgentStreamEvent | null = queue.length > 0
          ? queue.shift()!
          : await new Promise<AgentStreamEvent | null>((r) => { resolveNext = r; });

        if (event === null) {
          done = true;
          if (!failed) {
            yield { type: "done", fullContent: fullContent || this.getLastAssistantText() };
          }
        } else {
          yield event;
        }
      }
    } finally {
      unsubscribe();
      await promptPromise;
    }
  }

  async getMessages(): Promise<AgentMessage[]> {
    const msgs = this.session.agent?.state?.messages ?? [];
    return msgs
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("")
            : "",
        timestamp: new Date(m.timestamp ?? Date.now()),
      }));
  }

  private getLastAssistantText(): string {
    const msgs = this.session.agent?.state?.messages ?? [];

    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      const message = msgs[i] as any;
      if (message?.role !== "assistant") {
        continue;
      }

      if (typeof message.content === "string") {
        return message.content;
      }

      if (Array.isArray(message.content)) {
        return message.content
          .filter((content: any) => content.type === "text")
          .map((content: any) => content.text)
          .join("");
      }
    }

    return "";
  }

  destroy(): void { }
}

