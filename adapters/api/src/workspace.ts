import path from "node:path";
import type { FastifyRequest } from "fastify";
import {
  JsonlSkillsRepository,
  JsonlAgentsRepository,
  JsonlStepsRepository,
  JsonlTeamsRepository,
  JsonlWorkflowsRepository,
  JsonlProjectsRepository,
  JsonlTasksRepository,
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
    skills: path.join(base, "data", "skills.jsonl"),
    agents: path.join(base, "data", "agents.jsonl"),
    steps: path.join(base, "data", "steps.jsonl"),
    workflows: path.join(base, "data", "workflows.jsonl"),
    teams: path.join(base, "data", "teams.jsonl"),
    projects: path.join(base, "data", "projects.jsonl"),
    tasks: path.join(base, "data", "tasks.jsonl"),
  };
}

export async function createHandlers(workspacePath: string) {
  const ws = resolveWorkspace(workspacePath);

  const skillsRepo = new JsonlSkillsRepository(ws.skills);
  const agentsRepo = new JsonlAgentsRepository(ws.agents);
  const stepsRepo = new JsonlStepsRepository(ws.steps);
  const teamsRepo = new JsonlTeamsRepository(ws.teams);
  const workflowsRepo = new JsonlWorkflowsRepository(ws.workflows);
  const projectsRepo = new JsonlProjectsRepository(ws.projects);
  const tasksRepo = new JsonlTasksRepository(ws.tasks);

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
