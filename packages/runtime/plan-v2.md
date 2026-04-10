# Runtime V2 Plan

## Intent

Refactor the runtime so that:

- a project workflow is a sequence of visible business steps
- each workflow step owns a sequential list of internal actions
- actions can be `human`, `automation`, or `agent`
- the board tracks task position at the step level
- execution progresses inside a step through its actions before moving to the next step

This refactor is intentionally **not** backward compatible with the current workflow/task JSON shape.

## Product Model

### Workflow

The workflow remains the top-level execution frame for a project.

```ts
interface ProjectWorkflow {
  id: string
  steps: WorkflowStep[]
}

interface WorkflowStep {
  id: string
  name: string
  description: string
  actions: StepAction[]
}
```

### Actions

Each workflow step contains a mini-workflow:

```ts
type StepAction = HumanAction | AutomationAction | AgentAction

interface BaseAction {
  id: string
  name: string
  description: string
}

interface HumanAction extends BaseAction {
  kind: "human"
  transports: Transport[]
}

interface AutomationAction extends BaseAction {
  kind: "automation"
  codePath: string
}

interface AgentAction extends BaseAction {
  kind: "agent"
  agentId: string
}
```

## Execution Rules

### Task Position

A task exposes:

- `currentStepId` for board placement
- `currentActionId` for internal execution progress
- one shared execution state for the current action

The board only cares about the current workflow step.

### Action Semantics

- `automation`
  - launches automatically
  - if successful, advances automatically to the next action
  - if it is the last action, advances automatically to the next workflow step
- `agent`
  - launches automatically
  - does **not** move to the next action or step until the agent action has explicitly completed
  - if successful and it is the last action, the task advances to the next workflow step
- `human`
  - does not auto-complete
  - waits for explicit user completion
  - once completed, advances to the next action or next workflow step

### Runtime Invariants

- a task in `backlog` has no current step and no current action
- a task in `in_progress` always has a current step and current action
- a task in `completed` has no current step and no current action
- a task can only reference step/action ids that exist in its project workflow
- only one action can be active at a time per task
- step order and action order are always derived server-side from workflow arrays

## Target Domain Changes

### Replace Current Step Model

Replace the current domain model where a workflow directly contains:

- `HumanStep`
- `AutomationStep`
- `AgentStep`

with:

- `WorkflowStep`
- `HumanAction`
- `AutomationAction`
- `AgentAction`

### Replace Current Task Cursor

Replace the current `TaskCurrentStep` shape with something like:

```ts
class TaskCurrentStep {
  constructor(
    public readonly stepId: string,
    public readonly actionId: string,
    public executionState: ActionExecutionState = { status: "idle" },
  ) {}
}
```

If needed, rename this class to better reflect that it stores both step and action context.

## Persistence Changes

### Project JSON

Persist workflow steps with nested actions directly in `project.json`.

Example target shape:

```json
{
  "id": "...",
  "name": "Project",
  "description": "",
  "workflow": {
    "id": "...",
    "steps": [
      {
        "id": "...",
        "name": "Spec",
        "description": "",
        "actions": [
          {
            "id": "...",
            "kind": "agent",
            "name": "Draft brief",
            "description": "",
            "agentId": "..."
          },
          {
            "id": "...",
            "kind": "human",
            "name": "Approve brief",
            "description": "",
            "transports": []
          }
        ]
      }
    ]
  }
}
```

### Task JSON

Persist:

- `currentStep.id`
- `currentStep.actionId`
- current execution state

No migration layer is required.

## Application Changes

### Workflow Update Command

Update `UpdateProjectWorkflowCommand` so it accepts:

```ts
interface WorkflowStepInput {
  name: string
  description?: string
  actions: StepActionInput[]
}
```

Responsibilities:

- validate that each step has at least one action
- validate agent ids
- validate human transports
- scaffold automation files per action
- persist the resulting workflow

### Task Start / Move / Complete

#### Start

When a task starts on a step:

- resolve the target workflow step
- place the task on the first action of that step
- if the first action is `automation` or `agent`, launch it automatically

#### Complete

Completing a task action should:

- mark the current action as completed
- move to the next action in the same step if one exists
- otherwise move to the first action of the next step
- complete the task if no next step exists

#### Move

Moving a task between board columns should:

- change `currentStepId`
- reset the current action to the first action of the target step
- auto-launch if the first action is `automation` or `agent`

### Advance Service

Refactor `AdvanceTaskService` around:

1. resolve current step
2. resolve current action
3. compute next action or next step
4. dispatch execution by action kind

Likely entry points:

- `enterStep(taskId, stepId)`
- `advanceAfterActionCompletion(taskId)`
- `executeAutomationAction(taskId, action)`
- `executeAgentAction(taskId, action)`

Human actions should remain pending until explicit completion.

## Agent Runtime Integration

### Initial Scope

Agent actions should auto-launch, but the orchestration contract must remain explicit:

- starting an agent action does not count as completion
- workflow progression only happens when the agent action is marked completed

### Needed Hook

Introduce a clean path for:

- launching an agent action from the workflow runtime
- receiving completion/failure back into task orchestration

The first implementation can be minimal, but the runtime must not auto-skip agent actions just because they were launched.

## API Changes

### Project Detail

`GET /api/projects/:projectId` should return:

- workflow steps
- nested actions
- action-specific configuration needed by the editor

### Tasks By Project

`GET /api/projects/:projectId/tasks` should return:

- current step id
- current action id
- current action execution state

### Workflow Update

`PUT /api/projects/:projectId/workflow` should accept nested steps/actions.

## UI Changes

### Workflow Editor

Refactor the project workflow editor to:

- create business steps, not typed steps
- edit nested sequential actions inside each step
- reorder steps
- reorder actions within a step
- show agent names and automation code paths per action

### Board

Keep board columns at the workflow-step level.

Task cards should show:

- current action name
- current action kind
- optional progress like `2/4 actions`

Drag-and-drop should continue to move tasks across steps, not across actions.

## Suggested Implementation Phases

### Phase 1

- refactor domain types in `packages/runtime/domain/model`
- refactor project/task persistence
- refactor project/task queries

### Phase 2

- refactor workflow update command
- refactor start/move/complete commands
- refactor `AdvanceTaskService`

### Phase 3

- wire agent-action auto-launch contract
- keep human actions manual
- preserve automation action execution via TypeScript files

### Phase 4

- refactor project workflow editor UI
- update task board and task cards
- validate end-to-end behavior

## Validation Checklist

- create a workflow step with multiple actions
- start a task on a step whose first action is `human`
- start a task on a step whose first action is `automation`
- start a task on a step whose first action is `agent`
- complete an intermediate human action and verify same-column progression
- complete the last action of a step and verify next-step transition
- finish the last action of the last step and verify task completion
- move a task manually to another step and verify action cursor resets to the first action

## Out Of Scope

- backward compatibility with the current JSON model
- workflow-template migration
- implicit human validation after agent execution
- parallel actions inside a step
- branching workflows
