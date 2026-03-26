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
} from "../domain/ports/agent-runtime.js";

export interface CredentialEntry {
  provider: string;
  method: "api_key" | "oauth";
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

export class PiAgentRuntime implements AgentRuntime {
  private sessions = new Map<string, PiSessionHandle>();

  constructor(
    private readonly loadCredentials: () => Promise<CredentialEntry[]>,
    private readonly conversationsDir: string,
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
  }): Promise<AgentSessionHandle> {
    const { authStorage, modelRegistry } = await this.buildAuthAndRegistry();
    const model = modelRegistry.find(params.provider, params.model);

    if (!model) {
      throw new Error(
        `Model "${params.provider}/${params.model}" not found in pi's model registry. ` +
        `Available: ${modelRegistry.getAll().map((m) => `${m.provider}/${m.id}`).join(", ")}`,
      );
    }

    // Each conversation gets its own cwd — pi persists session JSONL there
    const cwd = this.sessionDir(params.sessionId);
    console.log(`[pi] Creating session in ${cwd}`);

    const sessionManager = SessionManager.create(cwd, cwd);

    const { session } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager,
      model,
      tools: [],
    });

    const handle = new PiSessionHandle(session, params.systemPrompt);
    this.sessions.set(params.sessionId, handle);
    return handle;
  }

  async resumeSession(sessionId: string): Promise<AgentSessionHandle> {
    // Check in-memory cache first
    const cached = this.sessions.get(sessionId);
    if (cached) return cached;

    // Rebuild session from persisted JSONL in the conversation directory
    const { authStorage, modelRegistry } = await this.buildAuthAndRegistry();
    const cwd = this.sessionDir(sessionId);
    console.log(`[pi] Resuming session in ${cwd}`);

    const sessionManager = SessionManager.continueRecent(cwd, cwd);

    const { session } = await createAgentSession({
      cwd,
      authStorage,
      modelRegistry,
      sessionManager,
      tools: [],
    });
    const handle = new PiSessionHandle(session, "");
    this.sessions.set(sessionId, handle);
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
    let done = false;

    const unsubscribe = this.session.subscribe((event: AgentSessionEvent) => {
      if (event.type === "message_update") {
        const ame = (event as any).assistantMessageEvent;
        if (ame?.type === "text_delta") {
          fullContent += ame.delta;
          push({ type: "text_delta", content: ame.delta });
        }
      } else if (event.type === "turn_end" || event.type === "agent_end") {
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
          yield { type: "done", fullContent };
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

  destroy(): void { }
}
