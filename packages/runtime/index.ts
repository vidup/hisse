// Domain — Ports
export type { HealthPort } from "./domain/ports/health.port.js";

// Application — Health
export { HealthCheckQuery, HealthCheckQueryHandler } from "./application/health-check.query.js";

// Infrastructure — File-based Repositories
export { FsSkillsRepository } from "./infrastructure/fs-skills.repository.js";
export { FsAgentsRepository } from "./infrastructure/fs-agents.repository.js";
export { FsStepsRepository } from "./infrastructure/fs-steps.repository.js";
export { FsWorkflowsRepository } from "./infrastructure/fs-workflows.repository.js";
export { FsTeamsRepository } from "./infrastructure/fs-teams.repository.js";
export { FsProjectsRepository } from "./infrastructure/fs-projects.repository.js";
export { FsTasksRepository } from "./infrastructure/fs-tasks.repository.js";
export { FsToolsRepository } from "./infrastructure/fs-tools.repository.js";

// Application — Knowledge (Skills)
export {
  CreateSkillCommand,
  CreateSkillCommandHandler,
} from "./application/knowledge/create-skill.command.js";
export { GetSkillsQuery, GetSkillsQueryHandler } from "./application/knowledge/get-skills.query.js";
export {
  GetSkillByIdQuery,
  GetSkillByIdQueryHandler,
} from "./application/knowledge/get-skill-by-id.query.js";
export {
  UpdateSkillCommand,
  UpdateSkillCommandHandler,
} from "./application/knowledge/update-skill.command.js";

// Application — Crew (Agents)
export {
  CreateAgentCommand,
  CreateAgentCommandHandler,
} from "./application/crew/create-agent.command.js";
export { GetAgentsQuery, GetAgentsQueryHandler } from "./application/crew/get-agents-list.query.js";
export {
  GetAgentConfigurationQuery,
  GetAgentConfigurationQueryHandler,
} from "./application/crew/get-agent-configuration.query.js";

// Application — Steps Library
export {
  AddStepToLibraryCommand,
  AddStepToLibraryCommandHandler,
} from "./application/steps-library/add-step-to-library.command.js";
export {
  GetStepsLibraryQuery,
  GetStepsLibraryQueryHandler,
} from "./application/steps-library/get-steps-library.query.js";

// Application — Teams
export {
  CreateTeamCommand,
  CreateTeamCommandHandler,
} from "./application/teams/create-team.command.js";
export {
  GetTeamsListQuery,
  GetTeamsListQueryHandler,
} from "./application/teams/get-teams-list.query.js";

// Application — Workflows
export { CreateWorkflowCommand, CreateWorkflowCommandHandler } from "./application/workflows/create-workflow.command.js";
export { UpdateWorkflowCommand, UpdateWorkflowCommandHandler } from "./application/workflows/update-workflow.command.js";
export { GetWorkflowsListQuery, GetWorkflowsListQueryHandler } from "./application/workflows/get-workflows-list.query.js";
export { GetWorkflowByIdQuery, GetWorkflowByIdQueryHandler } from "./application/workflows/get-workflow-by-id.query.js";

// Application — Projects
export { CreateProjectCommand, CreateProjectCommandHandler } from "./application/projects/create-project.command.js";
export { AddTaskToProjectCommand, AddTaskToProjectCommandHandler } from "./application/projects/add-task-to-project.command.js";
export { StartStepCommand, StartStepCommandHandler } from "./application/projects/start-step.command.js";
export { CompleteStepCommand, CompleteStepCommandHandler } from "./application/projects/complete-step.command.js";
export { GetProjectsByTeamQuery, GetProjectsByTeamQueryHandler } from "./application/projects/get-projects-by-team.query.js";
export { GetProjectByIdQuery, GetProjectByIdQueryHandler } from "./application/projects/get-project-by-id.query.js";
export { GetTasksByProjectQuery, GetTasksByProjectQueryHandler } from "./application/projects/get-tasks-by-project.query.js";
export { MoveTaskToStepCommand, MoveTaskToStepCommandHandler } from "./application/projects/move-task-to-step.command.js";

// Application — Tools
export { GetToolsQuery, GetToolsQueryHandler } from "./application/tools/get-tools.query.js";
