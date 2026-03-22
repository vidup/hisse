import { DEFAULT_WORKSPACE_ID } from "./config";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
  transports?: Array<{ type: string; target: string; configuration: Record<string, unknown>; authenticated: boolean }>;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  folderPath: string;
  workflow: string[];
  backlog: string[];
}

export interface FolderBrowseResult {
  current: string;
  parent: string | null;
  folders: { name: string; path: string }[];
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
    create: (body: { name: string; description: string; systemPrompt: string; provider: string; model: string; tools: string[]; skills: string[] }) =>
      post<{ ok: boolean }>(`/api/workspaces/${w}/agents`, body),
  },
  steps: {
    list: () => get<StepSummary[]>("/api/steps"),
    create: (body: { name: string; description: string; parameters: { kind: "agent"; agentId: string } | { kind: "human"; transports: Array<{ type: string; target: string; configuration: Record<string, unknown>; authenticated: boolean }> } }) =>
      post<{ ok: boolean }>("/api/steps", body),
  },
  teams: {
    list: () => get<TeamSummary[]>(`/api/workspaces/${w}/teams`),
    getWorkflow: (id: string) => get<string[]>(`/api/teams/${id}/workflow`),
    create: (body: { name: string; description: string; folderPath: string }) =>
      post<{ ok: boolean }>(`/api/workspaces/${w}/teams`, body),
    browseFolders: (path?: string) =>
      get<FolderBrowseResult>(`/api/folders${path ? `?path=${encodeURIComponent(path)}` : ""}`),
    updateWorkflow: (id: string, body: { steps: string[] }) =>
      put<{ ok: boolean }>(`/api/teams/${id}/workflow`, body),
  },
};
