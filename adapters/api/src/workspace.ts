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
  AddTaskToProjectCommandHandler,
  StartStepCommandHandler,
  CompleteStepCommandHandler,
} from "@hisse/runtime";

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

  await skillsRepo.preload();

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
    // Tasks
    addTaskToProject: new AddTaskToProjectCommandHandler(projectsRepo, tasksRepo),
    startStep: new StartStepCommandHandler(tasksRepo, stepsRepo),
    completeStep: new CompleteStepCommandHandler(tasksRepo),
    // Workspace info
    workspacePath,
  };
}
