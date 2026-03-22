// Domain — Ports
export type { HealthPort } from "./domain/ports/health.port.js";

// Application — Health
export { HealthCheckQuery, HealthCheckQueryHandler } from "./application/health-check.query.js";

// Infrastructure — JSONL Repositories
export { JsonlSkillsRepository } from "./infrastructure/jsonl-skills.repository.js";
export { JsonlAgentsRepository } from "./infrastructure/jsonl-agents.repository.js";
export { JsonlStepsRepository } from "./infrastructure/jsonl-steps.repository.js";
export { JsonlTeamsRepository } from "./infrastructure/jsonl-teams.repository.js";
export { JsonlWorkflowsRepository } from "./infrastructure/jsonl-workflows.repository.js";
export { JsonlProjectsRepository } from "./infrastructure/jsonl-projects.repository.js";
export { JsonlTasksRepository } from "./infrastructure/jsonl-tasks.repository.js";

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
