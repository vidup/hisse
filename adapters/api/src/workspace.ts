import path from "node:path";
import type { FastifyRequest } from "fastify";
import {
  AddTaskToProjectCommandHandler,
  CompleteStepCommandHandler,
  CreateAgentCommandHandler,
  CreateProjectCommandHandler,
  CreateSkillCommandHandler,
  FsAgentsRepository,
  FsConversationsRepository,
  FsProjectsRepository,
  FsSkillsRepository,
  FsTasksRepository,
  FsToolsRepository,
  FsWorkspaceChatSettingsRepository,
  GetAgentConfigurationQueryHandler,
  GetAgentsQueryHandler,
  GetConversationQueryHandler,
  GetConversationsQueryHandler,
  GetProjectByIdQueryHandler,
  GetProjectsListQueryHandler,
  GetSkillByIdQueryHandler,
  GetSkillsQueryHandler,
  GetTasksByProjectQueryHandler,
  GetToolsQueryHandler,
  GetWorkspaceChatSettingsQueryHandler,
  MoveTaskToStepCommandHandler,
  PiAgentRuntime,
  SendMessageCommandHandler,
  SetDefaultChatAgentCommandHandler,
  StartConversationCommandHandler,
  StartStepCommandHandler,
  UpdateProjectWorkflowCommandHandler,
  UpdateSkillCommandHandler,
} from "@hisse/runtime";
import {
  FsConnectorsRepository,
  GetConnectorByProviderQueryHandler,
  GetConnectorsQueryHandler,
  RemoveConnectorCommandHandler,
  SaveApiKeyConnectorCommandHandler,
  SaveOAuthConnectorCommandHandler,
} from "@hisse/connectors";

export function getWorkspaceFromRequest(request: FastifyRequest): string {
  const workspace = request.headers["x-workspace-path"];
  if (!workspace || typeof workspace !== "string") {
    throw Object.assign(new Error("Missing X-Workspace-Path header"), { statusCode: 400 });
  }
  return workspace;
}

export function resolveWorkspace(workspacePath: string) {
  const base = path.join(workspacePath, ".hisse");
  return {
    root: workspacePath,
    skills: path.join(base, "skills"),
    agents: path.join(base, "agents"),
    projects: path.join(base, "projects"),
    tools: path.join(base, "tools"),
    connectors: path.join(base, "connectors"),
    conversations: path.join(base, "conversations"),
    sessions: path.join(base, "sessions"),
    settings: path.join(base, "workspace-settings.json"),
  };
}

export async function createHandlers(workspacePath: string) {
  const ws = resolveWorkspace(workspacePath);

  const skillsRepo = new FsSkillsRepository(ws.skills);
  const agentsRepo = new FsAgentsRepository(ws.agents);
  const projectsRepo = new FsProjectsRepository(ws.projects);
  const tasksRepo = new FsTasksRepository(ws.projects);
  const toolsRepo = new FsToolsRepository(ws.tools);
  const connectorsRepo = new FsConnectorsRepository(ws.connectors);
  const conversationsRepo = new FsConversationsRepository(ws.conversations);
  const workspaceChatSettingsRepo = new FsWorkspaceChatSettingsRepository(ws.settings);

  await skillsRepo.preload();

  const loadCredentials = async () => {
    const connectors = await connectorsRepo.findAll();
    return connectors.map((connector) => ({
      provider: connector.provider,
      method: connector.method,
      apiKey: connector.method === "api_key" ? connector.apiKey : undefined,
      accessToken: connector.method === "oauth" ? connector.accessToken : undefined,
      refreshToken: connector.method === "oauth" ? connector.refreshToken : undefined,
      expiresAt: connector.method === "oauth" ? connector.expiresAt : undefined,
    }));
  };
  const agentRuntime = new PiAgentRuntime(loadCredentials, ws.root, ws.conversations, ws.skills);

  return {
    getSkills: new GetSkillsQueryHandler(skillsRepo),
    getSkillById: new GetSkillByIdQueryHandler(skillsRepo),
    createSkill: new CreateSkillCommandHandler(skillsRepo),
    updateSkill: new UpdateSkillCommandHandler(skillsRepo),
    getAgents: new GetAgentsQueryHandler(agentsRepo, skillsRepo),
    getAgentConfiguration: new GetAgentConfigurationQueryHandler(agentsRepo, skillsRepo),
    createAgent: new CreateAgentCommandHandler(agentsRepo),
    createProject: new CreateProjectCommandHandler(projectsRepo),
    updateProjectWorkflow: new UpdateProjectWorkflowCommandHandler(projectsRepo, agentsRepo),
    getProjectsList: new GetProjectsListQueryHandler(projectsRepo),
    getProjectById: new GetProjectByIdQueryHandler(projectsRepo),
    getTasksByProject: new GetTasksByProjectQueryHandler(tasksRepo),
    addTaskToProject: new AddTaskToProjectCommandHandler(projectsRepo, tasksRepo),
    startStep: new StartStepCommandHandler(tasksRepo, projectsRepo),
    completeStep: new CompleteStepCommandHandler(tasksRepo),
    moveTaskToStep: new MoveTaskToStepCommandHandler(tasksRepo, projectsRepo),
    getTools: new GetToolsQueryHandler(toolsRepo),
    getConnectors: new GetConnectorsQueryHandler(connectorsRepo),
    getConnectorByProvider: new GetConnectorByProviderQueryHandler(connectorsRepo),
    saveApiKeyConnector: new SaveApiKeyConnectorCommandHandler(connectorsRepo),
    saveOAuthConnector: new SaveOAuthConnectorCommandHandler(connectorsRepo),
    removeConnector: new RemoveConnectorCommandHandler(connectorsRepo),
    getConversations: new GetConversationsQueryHandler(conversationsRepo),
    getConversation: new GetConversationQueryHandler(conversationsRepo),
    sendMessage: new SendMessageCommandHandler(conversationsRepo, agentsRepo, skillsRepo, agentRuntime),
    startConversation: new StartConversationCommandHandler(
      conversationsRepo,
      agentsRepo,
      skillsRepo,
      agentRuntime,
      workspaceChatSettingsRepo,
    ),
    getWorkspaceChatSettings: new GetWorkspaceChatSettingsQueryHandler(workspaceChatSettingsRepo),
    setDefaultChatAgent: new SetDefaultChatAgentCommandHandler(workspaceChatSettingsRepo, agentsRepo),
    workspacePath,
  };
}
