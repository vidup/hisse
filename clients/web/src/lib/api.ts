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
};
