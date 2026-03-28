import path from "node:path";
import {
  createAgentSession,
  AuthStorage,
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
import type { ConversationActivity } from "../domain/model/message.js";
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
    default:
      return toolName;
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

    const { session } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager,
      model,
      tools: [],
      customTools: createPiSystemTools(cwd, this.skillsBaseDir, params.availableSkills),
    });

    const handle = new PiSessionHandle(session, params.systemPrompt);
    this.sessions.set(params.sessionId, handle);
    return handle;
  }

  async resumeSession(params: {
    sessionId: string;
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

    const { session } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager,
      tools: [],
      customTools: createPiSystemTools(cwd, this.skillsBaseDir, params.availableSkills),
    });
    const handle = new PiSessionHandle(session, "");
    this.sessions.set(params.sessionId, handle);
    return handle;
  }
}

class PiSessionHandle implements AgentSessionHandle {
  constructor(
    private readonly session: CreateAgentSessionResult["session"],
    private readonly systemPrompt: string,
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
        const existing = activities.get(event.toolCallId);
        if (existing) {
          push({ type: "activity_update", activity: existing });
        }
      } else if (event.type === "tool_execution_end") {
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

    if (this.systemPrompt) {
      this.session.agent.setSystemPrompt(this.systemPrompt);
    }

    const promptPromise = this.session.prompt(message).catch((err) => {
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

