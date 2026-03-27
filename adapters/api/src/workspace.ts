import path from "node:path";
import type { FastifyRequest } from "fastify";
import {
  FsSkillsRepository,
  FsAgentsRepository,
  FsStepsRepository,
  FsTeamsRepository,
  FsWorkflowsRepository,
  FsProjectsRepository,
  FsTasksRepository,
  FsToolsRepository,
  FsConversationsRepository,
  PiAgentRuntime,
  // Skills
  CreateSkillCommandHandler,
  GetSkillsQueryHandler,
  GetSkillByIdQueryHandler,
  UpdateSkillCommandHandler,
  // Agents
  CreateAgentCommandHandler,
  GetAgentsQueryHandler,
  GetAgentConfigurationQueryHandler,
  // Steps Library
  AddStepToLibraryCommandHandler,
  GetStepsLibraryQueryHandler,
  // Teams
  CreateTeamCommandHandler,
  GetTeamsListQueryHandler,
  // Workflows
  CreateWorkflowCommandHandler,
  UpdateWorkflowCommandHandler,
  GetWorkflowsListQueryHandler,
  GetWorkflowByIdQueryHandler,
  // Projects
  CreateProjectCommandHandler,
  GetProjectsByTeamQueryHandler,
  GetProjectByIdQueryHandler,
  GetTasksByProjectQueryHandler,
  AddTaskToProjectCommandHandler,
  StartStepCommandHandler,
  CompleteStepCommandHandler,
  MoveTaskToStepCommandHandler,
  // Tools
  GetToolsQueryHandler,
  // Chat
  StartConversationCommandHandler,
  SendMessageCommandHandler,
  GetConversationsQueryHandler,
  GetConversationQueryHandler,
} from "@hisse/runtime";
import {
  FsConnectorsRepository,
  GetConnectorsQueryHandler,
  GetConnectorByProviderQueryHandler,
  SaveApiKeyConnectorCommandHandler,
  SaveOAuthConnectorCommandHandler,
  RemoveConnectorCommandHandler,
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
    steps: path.join(base, "steps"),
    workflows: path.join(base, "workflows"),
    teams: path.join(base, "teams"),
    tools: path.join(base, "tools"),
    connectors: path.join(base, "connectors"),
    conversations: path.join(base, "conversations"),
    sessions: path.join(base, "sessions"),
  };
}

export async function createHandlers(workspacePath: string) {
  const ws = resolveWorkspace(workspacePath);

  const skillsRepo = new FsSkillsRepository(ws.skills);
  const agentsRepo = new FsAgentsRepository(ws.agents);
  const stepsRepo = new FsStepsRepository(ws.steps);
  const teamsRepo = new FsTeamsRepository(ws.teams);
  const workflowsRepo = new FsWorkflowsRepository(ws.workflows);
  const projectsRepo = new FsProjectsRepository(ws.teams);
  const tasksRepo = new FsTasksRepository(ws.teams);
  const toolsRepo = new FsToolsRepository(ws.tools);
  const connectorsRepo = new FsConnectorsRepository(ws.connectors);
  const conversationsRepo = new FsConversationsRepository(ws.conversations);

  await skillsRepo.preload();

  const loadCredentials = async () => {
    const connectors = await connectorsRepo.findAll();
    return connectors.map((c) => ({
      provider: c.provider,
      method: c.method,
      apiKey: c.method === "api_key" ? c.apiKey : undefined,
      accessToken: c.method === "oauth" ? c.accessToken : undefined,
      refreshToken: c.method === "oauth" ? c.refreshToken : undefined,
      expiresAt: c.method === "oauth" ? c.expiresAt : undefined,
    }));
  };
  const agentRuntime = new PiAgentRuntime(loadCredentials, ws.root, ws.conversations);

  return {
    // Skills
    getSkills: new GetSkillsQueryHandler(skillsRepo),
    getSkillById: new GetSkillByIdQueryHandler(skillsRepo),
    createSkill: new CreateSkillCommandHandler(skillsRepo),
    updateSkill: new UpdateSkillCommandHandler(skillsRepo),
    // Agents
    getAgents: new GetAgentsQueryHandler(agentsRepo, skillsRepo),
    getAgentConfiguration: new GetAgentConfigurationQueryHandler(agentsRepo, skillsRepo),
    createAgent: new CreateAgentCommandHandler(agentsRepo),
    // Steps
    getStepsLibrary: new GetStepsLibraryQueryHandler(stepsRepo),
    addStepToLibrary: new AddStepToLibraryCommandHandler(stepsRepo),
    // Workflows
    createWorkflow: new CreateWorkflowCommandHandler(workflowsRepo),
    updateWorkflow: new UpdateWorkflowCommandHandler(workflowsRepo, stepsRepo),
    getWorkflowsList: new GetWorkflowsListQueryHandler(workflowsRepo),
    getWorkflowById: new GetWorkflowByIdQueryHandler(workflowsRepo, stepsRepo),
    // Teams
    getTeamsList: new GetTeamsListQueryHandler(teamsRepo),
    createTeam: new CreateTeamCommandHandler(teamsRepo),
    // Projects
    createProject: new CreateProjectCommandHandler(projectsRepo, workflowsRepo),
    getProjectsByTeam: new GetProjectsByTeamQueryHandler(projectsRepo),
    getProjectById: new GetProjectByIdQueryHandler(projectsRepo, workflowsRepo, stepsRepo),
    getTasksByProject: new GetTasksByProjectQueryHandler(tasksRepo),
    // Tasks
    addTaskToProject: new AddTaskToProjectCommandHandler(projectsRepo, tasksRepo),
    startStep: new StartStepCommandHandler(tasksRepo, stepsRepo),
    completeStep: new CompleteStepCommandHandler(tasksRepo),
    moveTaskToStep: new MoveTaskToStepCommandHandler(tasksRepo, stepsRepo),
    // Tools
    getTools: new GetToolsQueryHandler(toolsRepo),
    // Connectors
    getConnectors: new GetConnectorsQueryHandler(connectorsRepo),
    getConnectorByProvider: new GetConnectorByProviderQueryHandler(connectorsRepo),
    saveApiKeyConnector: new SaveApiKeyConnectorCommandHandler(connectorsRepo),
    saveOAuthConnector: new SaveOAuthConnectorCommandHandler(connectorsRepo),
    removeConnector: new RemoveConnectorCommandHandler(connectorsRepo),
    // Chat
    getConversations: new GetConversationsQueryHandler(conversationsRepo),
    getConversation: new GetConversationQueryHandler(conversationsRepo),
    sendMessage: new SendMessageCommandHandler(conversationsRepo, agentsRepo, skillsRepo, agentRuntime),
    startConversation: new StartConversationCommandHandler(conversationsRepo, agentsRepo, skillsRepo, agentRuntime),
    // Workspace info
    workspacePath,
  };
}
