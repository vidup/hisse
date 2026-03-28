import { DEFAULT_WORKSPACE_ID } from "./config";

let workspacePath: string | null = null;

export async function initWorkspace(): Promise<string> {
  if (workspacePath) return workspacePath;

  if (window.electron) {
    workspacePath = await window.electron.getWorkspacePath();
  } else {
    // Browser fallback: use a default or prompt
    workspacePath = "C:/Workspace/hisse"; // dev fallback
  }
  return workspacePath;
}

export function setWorkspacePath(path: string) {
  workspacePath = path;
}

export function getWorkspacePath(): string | null {
  return workspacePath;
}

function workspaceHeaders(): Record<string, string> {
  if (!workspacePath) return {};
  return { "X-Workspace-Path": workspacePath };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { ...workspaceHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...workspaceHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...workspaceHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "DELETE",
    headers: { ...workspaceHeaders() },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Types matching API responses
export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  systemPrompt: string;
  provider: string;
  model: string;
  tools: string[];
  skills: { id: string; name: string }[];
}

export interface AgentConfiguration {
  systemPrompt: string;
  provider: string;
  model: string;
  tools: string[];
  skills: { id: string; name: string }[];
}

export interface StepSummary {
  id: string;
  name: string;
  description: string;
  agentId?: string;
  transports?: Array<{
    type: string;
    target: string;
    configuration: Record<string, unknown>;
    authenticated: boolean;
  }>;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  steps: StepSummary[];
}

export interface ProjectSummary {
  id: string;
  teamId: string;
  workflowId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  id: string;
  name: string;
  description: string;
  status: "backlog" | "in_progress" | "completed";
  projectId: string;
  currentStep: { id: string; index: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  teamId: string;
  workflowId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workflow: {
    id: string;
    name: string;
    steps: Array<{ id: string; name: string; description: string; kind: "agent" | "human"; agentId?: string }>;
  };
}

export interface ToolSummary {
  name: string;
  codePath: string;
}

export interface ToolDetail {
  name: string;
  files: Record<string, string>;
}

export interface ConnectorSummary {
  provider: string;
  method: "api_key" | "oauth";
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  status: "connected" | "expired" | "error";
  connectedAt: string;
  updatedAt: string;
}

export interface WorkspaceImportAgentPreview {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  skillIds: string[];
  toolNames: string[];
}

export interface WorkspaceImportSkillPreview {
  id: string;
  name: string;
  description: string;
}

export interface WorkspaceImportToolPreview {
  name: string;
}

export interface WorkspaceImportPreview {
  sourceWorkspacePath: string;
  agents: WorkspaceImportAgentPreview[];
  skills: WorkspaceImportSkillPreview[];
  tools: WorkspaceImportToolPreview[];
}

export interface WorkspaceImportResult {
  ok: boolean;
  importedAgents: number;
  importedSkills: number;
  importedTools: number;
}

// Chat types
export interface ConversationSummary {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationEntrySummary {
  kind: "user_turn" | "assistant_turn";
  text: string;
  status?: "in_progress" | "completed" | "failed";
  error?: string;
  timestamp: string;
  activities: AgentMessageActivitySummary[];
}

export interface AgentMessageActivitySummary {
  id: string;
  kind: "tool";
  name: string;
  label: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
}

export interface ConversationDetail extends ConversationSummary {
  entries: ConversationEntrySummary[];
}

export interface ChatStreamActivity {
  id: string;
  kind: "tool";
  name: string;
  label: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
}

export type ChatStreamEvent =
  | { type: "meta"; conversationId: string; agentId: string }
  | { type: "delta"; content: string }
  | { type: "activity_start"; activity: ChatStreamActivity }
  | { type: "activity_update"; activity: ChatStreamActivity }
  | { type: "activity_end"; activity: ChatStreamActivity }
  | { type: "done"; conversationId: string; agentId: string; fullContent: string }
  | { type: "error"; conversationId: string; agentId: string; error: string };

interface ChatStreamOptions {
  onEvent: (event: ChatStreamEvent) => void;
  signal?: AbortSignal;
}

async function streamChat(path: string, body: unknown, options: ChatStreamOptions): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...workspaceHeaders() },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        options.onEvent(JSON.parse(line) as ChatStreamEvent);
      }

      newlineIndex = buffer.indexOf("\n");
    }
  }

  const trailingLine = buffer.trim();
  if (trailingLine) {
    options.onEvent(JSON.parse(trailingLine) as ChatStreamEvent);
  }
}

const w = DEFAULT_WORKSPACE_ID;

export const api = {
  health: {
    check: () => get<{ status: string; service: string; timestamp: string }>("/api/health"),
  },
  skills: {
    list: () => get<SkillSummary[]>(`/api/workspaces/${w}/skills`),
    getById: (id: string) => get<SkillSummary>(`/api/skills/${id}`),
    create: (body: { name: string; description: string; content: string }) =>
      post<{ ok: boolean }>(`/api/workspaces/${w}/skills`, body),
    update: (id: string, body: { name: string; description: string; content: string }) =>
      put<{ ok: boolean }>(`/api/skills/${id}`, body),
  },
  agents: {
    list: () => get<AgentSummary[]>(`/api/workspaces/${w}/agents`),
    getConfig: (id: string) => get<AgentConfiguration>(`/api/agents/${id}/configuration`),
    create: (body: {
      name: string;
      description: string;
      systemPrompt: string;
      provider: string;
      model: string;
      tools: string[];
      skills: string[];
    }) => post<{ ok: boolean }>(`/api/workspaces/${w}/agents`, body),
  },
  steps: {
    list: () => get<StepSummary[]>("/api/steps"),
    create: (body: {
      name: string;
      description: string;
      parameters:
        | { kind: "agent"; agentId: string }
        | {
            kind: "human";
            transports: Array<{
              type: string;
              target: string;
              configuration: Record<string, unknown>;
              authenticated: boolean;
            }>;
          };
    }) => post<{ ok: boolean }>("/api/steps", body),
  },
  teams: {
    list: () => get<TeamSummary[]>(`/api/workspaces/${w}/teams`),
    create: (body: { name: string; description: string }) =>
      post<{ ok: boolean }>(`/api/workspaces/${w}/teams`, body),
  },
  workflows: {
    list: () => get<WorkflowSummary[]>("/api/workflows"),
    getById: (id: string) => get<WorkflowDetail>(`/api/workflows/${id}`),
    create: (body: { name: string; description: string }) =>
      post<{ ok: boolean }>("/api/workflows", body),
    update: (id: string, body: { steps: string[] }) =>
      put<{ ok: boolean }>(`/api/workflows/${id}`, body),
  },
  tools: {
    list: () => get<ToolSummary[]>("/api/tools"),
    getByName: (name: string) => get<ToolDetail>(`/api/tools/${encodeURIComponent(name)}`),
  },
  projects: {
    listByTeam: (teamId: string) =>
      get<ProjectSummary[]>(`/api/teams/${teamId}/projects`),
    create: (teamId: string, body: { name: string; workflowId: string }) =>
      post<{ ok: boolean }>(`/api/teams/${teamId}/projects`, body),
    getById: (projectId: string) => get<ProjectDetail>(`/api/projects/${projectId}`),
    getTasks: (projectId: string) => get<TaskSummary[]>(`/api/projects/${projectId}/tasks`),
    addTask: (projectId: string, body: { name: string; description: string }) =>
      post<{ ok: boolean }>(`/api/projects/${projectId}/tasks`, body),
  },
  tasks: {
    start: (taskId: string, body: { stepId: string; stepIndex: number }) =>
      post<{ ok: boolean }>(`/api/tasks/${taskId}/start`, body),
    move: (taskId: string, body: { stepId: string; stepIndex: number }) =>
      post<{ ok: boolean }>(`/api/tasks/${taskId}/move`, body),
    complete: (taskId: string) =>
      post<{ ok: boolean }>(`/api/tasks/${taskId}/complete`, {}),
  },
  connectors: {
    list: () => get<ConnectorSummary[]>(`/api/workspaces/${w}/connectors`),
    getByProvider: (provider: string) =>
      get<ConnectorSummary>(`/api/workspaces/${w}/connectors/${encodeURIComponent(provider)}`),
    saveApiKey: (body: { provider: string; apiKey: string }) =>
      post<{ ok: boolean }>(`/api/workspaces/${w}/connectors/api-key`, body),
    saveOAuth: (body: {
      provider: string;
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    }) => post<{ ok: boolean }>(`/api/workspaces/${w}/connectors/oauth`, body),
    remove: (provider: string) =>
      del<{ ok: boolean }>(`/api/workspaces/${w}/connectors/${encodeURIComponent(provider)}`),
  },
  workspaceImport: {
    preview: (sourceWorkspacePath: string) =>
      post<WorkspaceImportPreview>("/api/workspace-import/preview", { sourceWorkspacePath }),
    import: (body: { sourceWorkspacePath: string; agentIds: string[]; skillIds: string[]; toolNames: string[] }) =>
      post<WorkspaceImportResult>("/api/workspace-import", body),
  },
  chat: {
    list: () => get<ConversationSummary[]>("/api/conversations"),
    getById: (id: string) => get<ConversationDetail>(`/api/conversations/${id}`),
    start: (content: string, options: ChatStreamOptions) =>
      streamChat("/api/conversations", { content }, options),
    sendMessage: (id: string, content: string, options: ChatStreamOptions) =>
      streamChat(`/api/conversations/${id}/messages`, { content }, options),
  },
};
