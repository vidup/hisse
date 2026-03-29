// Domain ports
export type { HealthPort } from "./domain/ports/health.port.js";
export type { AgentsRepository } from "./domain/ports/agents.repository.js";
export type { SkillsRepository } from "./domain/ports/skills.repository.js";
export type { WorkspaceChatSettingsRepository } from "./domain/ports/workspace-chat-settings.repository.js";

// Domain models
export type { AgentId } from "./domain/model/agent.js";
export { Agent } from "./domain/model/agent.js";
export type { SkillId } from "./domain/model/skill.js";
export { Skill } from "./domain/model/skill.js";
export { AutomationStep } from "./domain/model/steps.js";
export type { StepExecutionState, StepExecutionStatus, StepInputRequest, StepInputResponse } from "./domain/model/task.js";
export type { StepExecutionContext } from "./domain/model/step-execution-context.js";
export type { StepExecutor, StepExecutionInput, StepExecutionResult, StepExecutionOutcome } from "./domain/ports/step-executor.port.js";
export { WorkspaceChatSettings } from "./domain/model/workspace-chat-settings.js";
export type {
  AssistantTurnEntry,
  AssistantTurnStatus,
  ConversationActivity,
  ConversationActivityKind,
  ConversationActivityStatus,
  ConversationArtifact,
  ConversationArtifactKind,
  ConversationArtifactStatus,
  ConversationEntry,
  ConversationEntryId,
  ConversationQuestionAnswer,
  ConversationQuestionAnswerInput,
  ConversationQuestionDefinition,
  ConversationQuestionDefinitionInput,
  ConversationQuestionOption,
  ConversationQuestionType,
  QuestionnaireArtifact,
  UserTurnEntry,
} from "./domain/model/message.js";

// Application - Health
export { HealthCheckQuery, HealthCheckQueryHandler } from "./application/health-check.query.js";

// Infrastructure - File-based repositories
export { FsSkillsRepository } from "./infrastructure/fs-skills.repository.js";
export { FsAgentsRepository } from "./infrastructure/fs-agents.repository.js";
export { FsProjectsRepository } from "./infrastructure/fs-projects.repository.js";
export { FsTasksRepository } from "./infrastructure/fs-tasks.repository.js";
export { FsToolsRepository } from "./infrastructure/fs-tools.repository.js";
export { FsWorkspaceChatSettingsRepository } from "./infrastructure/fs-workspace-chat-settings.repository.js";
export { TsStepExecutor } from "./infrastructure/ts-step-executor.js";

// Application - Knowledge
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

// Application - Crew
export {
  CreateAgentCommand,
  CreateAgentCommandHandler,
} from "./application/crew/create-agent.command.js";
export { GetAgentsQuery, GetAgentsQueryHandler } from "./application/crew/get-agents-list.query.js";
export {
  GetAgentConfigurationQuery,
  GetAgentConfigurationQueryHandler,
} from "./application/crew/get-agent-configuration.query.js";

// Application - Projects
export {
  CreateProjectCommand,
  CreateProjectCommandHandler,
} from "./application/projects/create-project.command.js";
export {
  UpdateProjectWorkflowCommand,
  UpdateProjectWorkflowCommandHandler,
} from "./application/projects/update-project-workflow.command.js";
export {
  AddTaskToProjectCommand,
  AddTaskToProjectCommandHandler,
} from "./application/projects/add-task-to-project.command.js";
export { AdvanceTaskService } from "./application/projects/advance-task.service.js";
export { StartStepCommand, StartStepCommandHandler } from "./application/projects/start-step.command.js";
export {
  CompleteStepCommand,
  CompleteStepCommandHandler,
} from "./application/projects/complete-step.command.js";
export {
  GetProjectsListQuery,
  GetProjectsListQueryHandler,
} from "./application/projects/get-projects-list.query.js";
export {
  GetProjectByIdQuery,
  GetProjectByIdQueryHandler,
} from "./application/projects/get-project-by-id.query.js";
export {
  GetTasksByProjectQuery,
  GetTasksByProjectQueryHandler,
} from "./application/projects/get-tasks-by-project.query.js";
export {
  MoveTaskToStepCommand,
  MoveTaskToStepCommandHandler,
} from "./application/projects/move-task-to-step.command.js";

// Application - Tools
export { GetToolsQuery, GetToolsQueryHandler } from "./application/tools/get-tools.query.js";

// Application - Workspace
export {
  GetWorkspaceChatSettingsQuery,
  GetWorkspaceChatSettingsQueryHandler,
} from "./application/workspace/get-workspace-chat-settings.query.js";
export {
  SetDefaultChatAgentCommand,
  SetDefaultChatAgentCommandHandler,
} from "./application/workspace/set-default-chat-agent.command.js";

// Domain - Chat
export { Conversation, ConversationCreatedEvent } from "./domain/model/conversation.js";
export type { ConversationId, ConversationEvent } from "./domain/model/conversation.js";
export type {
  AgentRuntime,
  AgentSessionHandle,
  AgentStreamEvent,
  AgentMessage,
} from "./domain/ports/agent-runtime.js";
export type { ConversationsRepository } from "./domain/ports/conversations.repository.js";
export { parseMentions, parseSkillInvocations } from "./domain/services/parse-input.js";

// Infrastructure - Chat
export { FsConversationsRepository } from "./infrastructure/fs-conversations.repository.js";
export { PiAgentRuntime, type CredentialEntry } from "./infrastructure/pi-agent-runtime.js";

// Application - Chat
export {
  StartConversationCommand,
  StartConversationCommandHandler,
} from "./application/chat/start-conversation.command.js";
export { SendMessageCommand, SendMessageCommandHandler } from "./application/chat/send-message.command.js";
export { GetConversationsQuery, GetConversationsQueryHandler } from "./application/chat/get-conversations.query.js";
export { GetConversationQuery, GetConversationQueryHandler } from "./application/chat/get-conversation.query.js";
