# Domain Model Refactor

> Preparation note for the next domain refactor.
> Goal: simplify the core model before introducing automated step execution.

---

## Why Refactor

The current model has three structural problems:

1. `Team` adds routing and persistence complexity without carrying meaningful runtime rules.
2. `Project` points to a catalog `workflowId`, which keeps project execution coupled to shared catalog state.
3. `Task` execution depends on client-provided `stepIndex`, which is a weak foundation for automatic orchestration.

Before adding `AutomationStep`, agent auto-advance, or human transport delivery, the model needs to become project-centric and execution-friendly.

---

## Main Decisions

### 1. Remove `Team` From The Core Domain

`Team` is not a first-class business concept in the current product.
It mostly exists to create subfolders and route URLs.

Decision:

- remove `Team` from the runtime domain model,
- remove `teamId` from `Project`,
- move to a direct `Workspace -> Project -> Task` hierarchy,
- keep grouping or folder organization as a later UI/infrastructure concern if needed.

### 2. Make Workflow Local To The Project

A project should carry its own workflow definition.

Decision:

- remove `workflowId` from `Project`,
- embed a `ProjectWorkflow` inside each `Project`,
- make workflow snapshotting the default behavior by design,
- keep reusable workflows as templates, not as a prerequisite for project creation.

### 3. Keep Steps, But Stop Centering The Step Catalog

Steps still matter for execution, but they should no longer be mandatory catalog entities.

Decision:

- define steps inside `ProjectWorkflow`,
- keep the current step kinds as a discriminated union,
- allow reusable templates later,
- do not keep a global step catalog at the center of the happy path.

### 4. Prepare A Shared Execution Runtime For All Step Types

All step kinds should share one execution model.

Decision:

- a task enters a step,
- the runtime creates or updates a step execution state,
- the runtime dispatches to the step kind implementation,
- each step kind provides a different `stepFunction`,
- the execution lifecycle itself is shared.

This is the foundation for:

- `AgentStep`: launch agent
- `HumanStep`: transport call + waiting for input
- `AutomationStep`: deterministic code execution

---

## Target Domain Model

### Workspace

The workspace remains the top-level boundary for catalogs and persistence.

```ts
interface Workspace {
  id: string
}
```

The workspace still owns shared resources such as:

- agents
- skills
- tools
- workflow templates

But those are not required to create a project.

### Project

```ts
type ProjectId = string

class Project {
  id: ProjectId
  name: string
  description: string
  workflow: ProjectWorkflow
  createdAt: Date
  updatedAt: Date
}
```

Notes:

- `teamId` disappears
- `workflowId` disappears
- project creation always produces a concrete local workflow

### ProjectWorkflow

```ts
type ProjectWorkflowId = string

interface ProjectWorkflow {
  id: ProjectWorkflowId
  name: string
  steps: ProjectStep[]
}
```

Notes:

- workflow order is defined by the array
- next step is derived server-side from that array
- no client-owned `stepIndex`

### ProjectStep

```ts
type ProjectStepId = string

type ProjectStep = AgentStep | HumanStep | AutomationStep

interface BaseStep {
  id: ProjectStepId
  name: string
  description: string
}

interface AgentStep extends BaseStep {
  type: "agent"
  agentId: string
}

interface HumanStep extends BaseStep {
  type: "human"
  transports: Transport[]
}

interface AutomationStep extends BaseStep {
  type: "automation"
  automationKey: string
  config: Record<string, unknown>
}
```

### Task

```ts
type TaskId = string
type TaskStatus = "backlog" | "in_progress" | "completed"

class Task {
  id: TaskId
  projectId: ProjectId
  name: string
  description: string
  status: TaskStatus
  currentStepId: ProjectStepId | null
  currentExecution: TaskStepExecution | null
  createdAt: Date
  updatedAt: Date
}
```

### TaskStepExecution

```ts
type TaskStepExecutionStatus =
  | "pending"
  | "running"
  | "waiting_for_input"
  | "completed"
  | "failed"

interface TaskStepExecution {
  stepId: ProjectStepId
  status: TaskStepExecutionStatus
  enteredAt: Date
  startedAt?: Date
  completedAt?: Date
  summary?: string
}
```

Why this matters:

- the task global status stays simple
- step-level runtime state becomes explicit
- the same execution shape works for agent, human, and automation

### WorkflowTemplate

Templates become the reusable layer, not the primary runtime object.

```ts
type WorkflowTemplateId = string

interface WorkflowTemplate {
  id: WorkflowTemplateId
  name: string
  description: string
  steps: TemplateStep[]
  createdAt: Date
  updatedAt: Date
}

type TemplateStep = Omit<ProjectStep, "id">
```

Templates support:

- create project from template
- publish project workflow as template
- reuse without coupling active projects together

---

## Invariants

### Project Invariants

- a project always has a workflow
- a project workflow always owns its steps
- step ids are unique inside a project workflow
- a project can exist without any template relationship

### Task Invariants

- a task in `backlog` has `currentStepId = null`
- a task in `in_progress` has `currentStepId !== null`
- a task in `completed` has `currentStepId = null`
- a task can only point to a step that exists in its project's workflow
- step ordering is derived from the workflow, never trusted from the client

### Execution Invariants

- at most one active `currentExecution` per task
- entering a step updates `currentStepId` and initializes `currentExecution`
- step completion does not imply task completion
- task completion happens only when no next step exists or when explicitly forced

---

## Command Model

### Project Commands

- `CreateProject(name, description, workflowDraft)`
- `CreateProjectFromTemplate(name, description, templateId)`
- `UpdateProjectWorkflow(projectId, workflowDraft)` later
- `PublishWorkflowTemplate(projectId, name, description)` later

### Task Commands

- `CreateTask(projectId, name, description)`
- `StartTask(taskId)`
- `MoveTaskToStep(taskId, targetStepId)`
- `AdvanceTask(taskId)`
- `CompleteTask(taskId)`

### Execution Commands

- `EnterStep(taskId, stepId)`
- `StartStepExecution(taskId)`
- `CompleteStepExecution(taskId, summary?)`
- `FailStepExecution(taskId, summary?)`
- `WaitForStepInput(taskId, summary?)`

The exact split between domain commands and application commands can be refined during implementation, but the key point is that execution is now modeled explicitly.

---

## Execution Strategy Model

All steps use the same runtime shell:

1. task enters a step
2. execution state is created or updated
3. runtime dispatches by step type
4. step-specific function runs
5. runtime decides whether to wait, advance, fail, or complete the task

Pseudo-shape:

```ts
interface StepRuntimeStrategy<TStep extends ProjectStep> {
  supports(step: ProjectStep): step is TStep
  run(context: StepExecutionContext<TStep>): Promise<StepExecutionResult>
}
```

Examples:

- `AgentStepStrategy` -> launch agent session
- `HumanStepStrategy` -> trigger transports, then return `waiting_for_input`
- `AutomationStepStrategy` -> execute deterministic code

This strategy layer is intentionally out of scope for the first refactor implementation, but the domain model should prepare it cleanly.

---

## Old To New Mapping

### Remove

- `Team`
- `teamId` on `Project`
- runtime dependency on shared `Workflow`
- runtime dependency on shared `Step`
- `TaskCurrentStep.index`

### Replace

- `Project.workflowId` -> `Project.workflow`
- `Workflow.steps: StepId[]` -> `ProjectWorkflow.steps: ProjectStep[]`
- `Task.currentStep: { id, index }` -> `Task.currentStepId`
- implicit execution state -> `Task.currentExecution`

### Introduce Later

- `WorkflowTemplate`
- `AutomationStep`
- execution strategy runtime

---

## Migration Plan

### Phase 1 - Refactor The Domain Shape

Goal:

- define the new domain model in code
- stop adding behavior on top of `Team`, catalog `Workflow`, and catalog `Step`

Changes:

- add `ProjectWorkflow` and `ProjectStep`
- add `TaskStepExecution`
- remove `teamId` from `Project`
- remove `workflowId` from `Project`
- replace `TaskCurrentStep` with `currentStepId`

### Phase 2 - Refactor Persistence

Goal:

- persist projects as self-contained workflow owners

Changes:

- change project JSON format to store embedded workflow
- change task JSON format to store `currentStepId` and `currentExecution`
- stop resolving project execution through workflow and step repositories

### Phase 3 - Refactor Queries And API

Goal:

- expose project-local workflow structure directly to the UI

Changes:

- remove team-scoped routes
- move from `/api/teams/:teamId/projects/...` to `/api/projects/...` or `/api/workspaces/:workspaceId/projects/...`
- remove `stepIndex` from task start/move requests
- make the server derive next step ordering

### Phase 4 - Introduce Workflow Templates

Goal:

- reintroduce reusability on top of the simpler model

Changes:

- create `WorkflowTemplate`
- add `CreateProjectFromTemplate`
- add `PublishWorkflowTemplate`

### Phase 5 - Introduce Unified Step Execution

Goal:

- build automatic runtime behavior on top of the clean model

Changes:

- add execution states
- add strategy dispatch per step kind
- implement agent and human behavior on top of the shared runtime
- implement automation last

---

## Impacted Areas

The refactor will touch at least:

- `packages/runtime/domain/model/project.ts`
- `packages/runtime/domain/model/task.ts`
- `packages/runtime/domain/model/steps.ts`
- `packages/runtime/domain/model/workflow.ts`
- `packages/runtime/domain/model/team.ts`
- `packages/runtime/domain/ports/projects.repository.ts`
- `packages/runtime/domain/ports/tasks.repository.ts`
- `packages/runtime/infrastructure/fs-projects.repository.ts`
- `packages/runtime/infrastructure/fs-tasks.repository.ts`
- `packages/runtime/application/projects/*`
- `adapters/api/src/routes/projects.routes.ts`
- `adapters/api/src/routes/teams.routes.ts`
- `clients/web/src/pages/projects/*`
- `clients/web/src/pages/teams/*`
- `clients/web/src/hooks/use-projects.ts`
- `clients/web/src/lib/api.ts`

---

## Out Of Scope For This Refactor

- implementing `AutomationStep`
- implementing agent auto-advance
- implementing transport delivery
- introducing step templates
- solving collaborative editing of project workflows

This refactor is about creating healthy foundations, not shipping all runtime behaviors at once.

---

## Proposed Order Of Implementation

1. Refactor the domain model and persistence shape
2. Remove team dependencies from queries, API, and UI
3. Make projects own workflows directly
4. Make tasks point to step ids only
5. Reintroduce templates
6. Build unified step execution

This order keeps the platform shippable while reducing the risk of redoing orchestration work twice.
