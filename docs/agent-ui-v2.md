# Agent UI V2

## Intent

This document describes the next evolution of the chat experience:

- make the empty state much more inviting
- allow conversations to start without requiring an explicit `@agent` in the text
- surface agent work more clearly during a conversation
- keep the model compatible with future multi-agent conversations

This is intentionally scoped to the general chat experience first, outside of projects.

## Product Goals

- Let a user start a conversation quickly, even when they do not yet know which agent to mention.
- Reuse existing domain concepts instead of inventing new ones.
- Keep `agent` and `skill` as the only core concepts in the launch UI.
- Make the assistant output feel more like a work surface than a bubble chat.
- Expose the agent's current plan, working files, and context in a dedicated side panel.
- Avoid UI and API choices that would block future multi-agent orchestration.

## Domain Direction

### Workspace default chat agent

The workspace should gain a real domain setting:

- `workspace.defaultChatAgentId`

This setting is used only as a fallback for the general chat.

Resolution order for the agent(s) handling a message should be:

1. Agents explicitly mentioned in the message
2. Explicit `launchAgentId` provided by the UI
3. `workspace.defaultChatAgentId`
4. Guided setup if nothing is configured

This means the first message should no longer require an `@agent` to work.

### Future project-level override

Later, projects can adopt the same pattern:

- `project.defaultChatAgentId`

Future resolution order:

1. Explicitly mentioned agents
2. `project.defaultChatAgentId` when inside a project
3. `workspace.defaultChatAgentId`
4. Guided setup

### Important modeling choice

We should not introduce a separate "default model" concept in the chat domain.

Instead, the default should be a real agent:

- editable
- visible
- portable with the workspace
- compatible with skills
- compatible with future import/export

This keeps the system aligned with the existing domain model.

## UI Direction

### Empty state / launch surface

When no conversation is active, the center of the screen should become a true launch surface:

- large centered composer
- strong visual invitation to start a conversation
- visible primary agent selection
- visible quick access to skills for that agent
- send button hidden until the user types something

The left sidebar can remain structurally unchanged.

### Agent and skill presentation

We should not introduce a new "preset" or "plugin" concept.

Instead:

- the selected launch agent is just an `agent`
- the quick actions are just the `skills` of that agent

This effectively merges:

- slash commands
- quick launch actions
- skill shortcuts

without changing the underlying model.

The intended behavior:

1. Pick a primary agent for the launch surface
2. Display that agent's skills as quick actions
3. Clicking a skill pre-fills the composer with a focused prompt, effectively behaving like a quick command

### Choosing the launch agent

The agent displayed in the launch surface should be resolved using this order:

1. Agent explicitly selected in the UI
2. Agent from the most recent conversation
3. `workspace.defaultChatAgentId`
4. Guided setup if none exists

This choice only affects the launch surface and fallback behavior.

It should not imply that a conversation is forever limited to one agent.

## Conversation Layout

### Message presentation

User messages should remain visually distinct, with chat bubbles.

Assistant messages should no longer be rendered as classic bubbles. They should instead appear as full-width work output:

- more compact
- more document-like
- more consistent with agentic work

This creates a stronger contrast between:

- user intent
- AI output

### Right panel

Once a conversation has started, a right-side panel should appear and become a real part of the experience.

Initial sections:

1. `Plan`
2. `Working files`
3. `Context`

#### Plan

- shows the latest known plan produced by the agent
- shows a skeleton state when no plan exists yet

#### Working files

- shows files produced or modified by the agent
- gives fast access without forcing the user to scroll back through the conversation

#### Context

- shows useful context involved in the run
- skills invoked
- tools used
- files read
- external connectors or searches used

The right panel should support drill-down views. For example:

- clicking a search activity opens search results
- clicking a file item opens the file preview
- clicking a context item opens more detail

## Planning Tool

We should add a lightweight planning capability for general agents.

Suggested system tool:

- `UpdatePlan({ steps: [{ id, label, status }] })`

This tool should not be shown as raw execution details.

Instead, its latest emitted value should be projected into the `Plan` section of the right panel.

This provides immediate user value:

- makes the agent legible
- reduces uncertainty
- makes long-running work easier to follow

## API Direction

The chat API should stop depending on a mandatory `@agent` in the content.

The start conversation endpoint should evolve toward something like:

```ts
POST /api/conversations
{
  content: string;
  launchAgentId?: string;
}
```

Message routing logic should then resolve the effective agent(s) from:

- explicit mentions inside the content
- `launchAgentId`
- workspace default

The important part is that the selected launch agent must be passed as structured input, not hidden inside the text.

## Multi-Agent Compatibility

Even if execution remains mono-agent at first, the UI and API must not block multi-agent orchestration later.

The user should eventually be able to write messages like:

- `@coder propose an architecture`
- `@design explore interface options`

Potentially within the same conversation.

To keep that path open:

- the launch surface should talk about `Primary agent` or `Start with`
- not "the one and only conversation agent"
- explicit mentions should continue to exist
- the API should remain evolvable toward multiple targeted agents

In practice, the model should distinguish:

- launch agent or fallback agent
- explicitly mentioned agents

This keeps V2 compatible with future multi-agent execution.

## Setup Flow

If the workspace has no default chat agent, the user should be guided through a lightweight setup.

The setup should:

1. inspect available connected providers
2. let the user choose provider and model
3. create or configure a real default workspace agent

This setup is preferable to asking the user to manually author an agent before being able to chat at all.

## Rollout Plan

### Slice 1

- Add `workspace.defaultChatAgentId`
- Allow starting a conversation without mandatory `@agent`
- Resolve fallback from `launchAgentId` and workspace default
- Add minimal setup flow when no default agent exists

### Slice 2

- Replace the empty chat state with a centered launch surface
- Show primary agent selection
- Show that agent's skills as quick actions
- Hide the send button until the user starts typing

### Slice 3

- Remove assistant bubble styling
- Render assistant output as full-width work content
- Keep user messages as bubbles

### Slice 4

- Turn the right panel into a real conversation workspace
- Add `Plan`
- Add `Working files`
- Add `Context`

### Slice 5

- Add the lightweight `UpdatePlan` system tool
- Project its latest state into the right panel

## Non-Goals For This Phase

- Full multi-agent runtime orchestration
- Project-specific chat defaults
- A new preset or plugin domain concept
- Replacing skills with a separate command system

## Summary

Agent UI V2 should:

- keep the existing domain clean
- rely on a workspace-level default chat agent
- make chat launch much faster and more inviting
- surface skills as the natural quick actions of the selected agent
- make assistant output feel like work output rather than bubble chat
- expose plan, working files, and context in the right panel
- stay compatible with future multi-agent conversations
