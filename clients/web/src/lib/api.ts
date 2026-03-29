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

export interface ProjectWorkflowTransportInput {
  type: string;
  target: string;
  configuration: Record<string, unknown>;
  authenticated: boolean;
}

export type ProjectWorkflowStepInput =
  | {
      kind: "agent";
      name: string;
      description?: string;
      agentId: string;
    }
  | {
      kind: "human";
      name: string;
      description?: string;
      transports: ProjectWorkflowTransportInput[];
    }
  | {
      kind: "automation";
      name: string;
      description?: string;
    };

export interface ProjectCreateInput {
  name: string;
  description?: string;
}

export interface UpdateProjectWorkflowInput {
  steps: ProjectWorkflowStepInput[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  workflow: {
    id: string;
    stepCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type StepExecutionStateSummary =
  | { status: "idle" }
  | { status: "running"; startedAt: string }
  | { status: "completed"; startedAt: string; completedAt: string; durationMs: number }
  | { status: "failed"; startedAt: string; failedAt: string; durationMs: number; reason: string }
  | { status: "waiting_for_input"; startedAt: string; inputRequest: unknown; inputResponse?: unknown };

export interface TaskSummary {
  id: string;
  name: string;
  description: string;
  status: "backlog" | "in_progress" | "completed";
  projectId: string;
  currentStep: { id: string; executionState: StepExecutionStateSummary } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  workflow: {
    id: string;
    steps: Array<
      | { id: string; name: string; description: string; kind: "agent"; agentId?: string }
      | { id: string; name: string; description: string; kind: "human" }
      | { id: string; name: string; description: string; kind: "automation"; codePath?: string }
    >;
  };
}

export interface ToolSummary {
  name: string;
  codePath: string;
}

export interface ToolDetail {
  name: string;
  codePath: string;
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

export interface WorkspaceChatSettingsSummary {
  workspaceId: string;
  defaultChatAgentId: string | null;
}

export interface WorkspaceImportAgentPreview {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  skillIds: string[];
  toolNames: string[];
  status: "new" | "conflict";
  conflictReasons: string[];
}

export interface WorkspaceImportSkillPreview {
  id: string;
  name: string;
  description: string;
  status: "new" | "conflict";
  conflictReason?: string;
}

export interface WorkspaceImportToolPreview {
  name: string;
  status: "new" | "conflict";
  conflictReason?: string;
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
  plan?: ConversationPlanSummary;
  artifacts: ConversationArtifactSummary[];
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

export interface ConversationPlanStepSummary {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ConversationPlanSummary {
  steps: ConversationPlanStepSummary[];
  updatedAt: string;
}

export interface ConversationQuestionOptionSummary {
  id: string;
  label: string;
}

export interface ConversationQuestionScaleMarkSummary {
  value: number;
  label?: string;
}

export interface ConversationQuestionScaleRangeSummary {
  min: number;
  max: number;
  step: number;
  unit?: string;
  marks: ConversationQuestionScaleMarkSummary[];
}

export interface ConversationQuestionSummary {
  id: string;
  label: string;
  description?: string;
  type: "yes_no" | "single_select" | "multi_select" | "scale";
  options: ConversationQuestionOptionSummary[];
  range?: ConversationQuestionScaleRangeSummary;
}

export interface ConversationQuestionAnswerSummary {
  questionId: string;
  selectedOptionIds: string[];
  numericValue?: number;
  comment: string;
}

export interface QuestionnaireArtifactSummary {
  id: string;
  kind: "questionnaire";
  title?: string;
  instructions?: string;
  status: "pending" | "answered";
  questions: ConversationQuestionSummary[];
  answers: ConversationQuestionAnswerSummary[];
  createdAt: string;
  answeredAt?: string;
}

export type ConversationArtifactSummary = QuestionnaireArtifactSummary;

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
  | { type: "plan_update"; plan: ConversationPlanSummary }
  | { type: "artifact_update"; artifact: ConversationArtifactSummary }
  | { type: "done"; conversationId: string; agentId: string; fullContent: string }
  | { type: "error"; conversationId: string; agentId: string; error: string };

export interface HitlResponseInput {
  artifactId: string;
  answers: Array<{
    questionId: string;
    selectedOptionIds?: string[];
    numericValue?: number;
    comment?: string;
  }>;
}

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
  tools: {
    list: () => get<ToolSummary[]>("/api/tools"),
    getByName: (name: string) => get<ToolDetail>(`/api/tools/${encodeURIComponent(name)}`),
  },
  projects: {
    list: () => get<ProjectSummary[]>("/api/projects"),
    create: (body: ProjectCreateInput) =>
      post<{ ok: boolean }>("/api/projects", body),
    updateWorkflow: (projectId: string, body: UpdateProjectWorkflowInput) =>
      put<{ ok: boolean }>(`/api/projects/${projectId}/workflow`, body),
    getById: (projectId: string) => get<ProjectDetail>(`/api/projects/${projectId}`),
    getTasks: (projectId: string) => get<TaskSummary[]>(`/api/projects/${projectId}/tasks`),
    addTask: (projectId: string, body: { name: string; description: string }) =>
      post<{ ok: boolean }>(`/api/projects/${projectId}/tasks`, body),
  },
  tasks: {
    start: (taskId: string, body: { stepId: string }) =>
      post<{ ok: boolean }>(`/api/tasks/${taskId}/start`, body),
    move: (taskId: string, body: { stepId: string }) =>
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
  workspaceSettings: {
    getChat: () => get<WorkspaceChatSettingsSummary>(`/api/workspaces/${w}/settings/chat`),
    updateChat: (body: { defaultChatAgentId: string | null }) =>
      put<{ ok: boolean }>(`/api/workspaces/${w}/settings/chat`, body),
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
    start: (body: { content: string; launchAgentId?: string }, options: ChatStreamOptions) =>
      streamChat("/api/conversations", body, options),
    sendMessage: (
      id: string,
      body: { content?: string; hitlResponse?: HitlResponseInput },
      options: ChatStreamOptions,
    ) => streamChat(`/api/conversations/${id}/messages`, body, options),
  },
};
