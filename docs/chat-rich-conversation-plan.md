# Chat Rich Conversation Plan

> Plan for evolving Hisse chat from a flat canonical transcript to a richer, domain-owned conversation model.
> Pi remains the raw execution engine and technical trace.
> Hisse owns the product model, the product read models, and the persistence boundary.

---

## Why This Plan Exists

The current chat architecture was deliberately simplified:

- one user message is persisted immediately
- assistant text is streamed in memory
- one assistant message is persisted at the end
- Pi raw JSONL is kept separately for debugging

That simplification is now too small for the product we want:

- the agent can use tools
- the user needs to see what is happening while the agent works
- the product needs a richer replay than plain assistant text
- HITL will soon require first-class interaction states

The conversation `04c781ad-db86-47a3-afd9-d79dac9daf3f` is a good proof case:

- the canonical `transcript.jsonl` is almost empty
- the raw Pi session contains the real story:
  - multiple assistant cycles
  - tool calls
  - tool results
  - final assistant text

So the problem is not that Pi lacks the data.
The problem is that Hisse currently flattens too much of that data at the product boundary.

---

## Main Decision

The retained direction is:

- keep `Conversation` as the aggregate root
- stop treating the canonical model as "just a list of final text messages"
- introduce a richer product-level conversation model
- keep Pi raw session JSONL untouched as the technical source
- build Hisse-owned canonical events and read models from Pi execution

Important consequence:

- Pi raw JSONL is not the product model
- Hisse canonical events are not a copy of Pi schema
- Hisse must project the raw runtime trace into a stable domain language

In short:

- Pi knows how to execute
- Hisse knows how to represent

---

## Problem In The Current Flow

The current runtime bridge assumes a request ends when the first assistant turn ends.

That assumption is false for tool-based execution.

With Pi, one user prompt can produce:

1. an assistant tool-planning turn
2. several tool calls
3. several tool results
4. one or more additional assistant turns
5. one final assistant answer

Today Hisse loses richness in two ways:

1. it only forwards `text_delta`
2. it persists a single assistant message too early for tool-driven runs

This means the current simplification is not only poor in fidelity.
It is also semantically wrong for agent runs that span multiple internal turns.

---

## Product Goals

The next chat model must allow Hisse to:

- show live tool activity while the assistant is working
- persist a canonical conversation that survives reloads
- remain domain-first and runtime-agnostic
- keep raw Pi traces for audit, repair, and migration
- support future HITL states without redesigning chat again
- avoid leaking Pi internal message schema directly into the product model

---

## Target Layering

We keep three distinct layers.

### 1. Raw Runtime Trace

Owned by Pi.

Contains:

- provider-specific messages
- tool calls
- tool results
- reasoning blocks
- usage
- timestamps
- technical ids

Purpose:

- audit
- debugging
- repair
- migration
- forensic replay

### 2. Canonical Conversation Events

Owned by Hisse.

This becomes the write-side product truth.

Contains:

- user turn start
- assistant turn start
- assistant text append
- activity start
- activity update
- activity end
- assistant turn complete
- assistant turn fail
- artifact emitted
- user input requested

Purpose:

- stable product persistence
- runtime-independent semantics
- clean input for read models

### 3. Read Models

Owned by Hisse.

Examples:

- transcript for the chat UI
- activity timeline attached to an assistant turn
- future HITL panels
- future proposal/file preview cards

Purpose:

- render exactly what the product needs
- avoid querying raw Pi state directly

---

## Domain Direction

The domain should evolve from flat `Message` records to conversation entries that can represent execution.

The intended direction is:

- `Conversation` stays the aggregate root
- a conversation contains ordered `ConversationEntry`
- a `ConversationEntry` is either:
  - a `UserMessageEntry`
  - an `AssistantTurnEntry`

`AssistantTurnEntry` is the key new concept.

It represents one product-visible assistant response lifecycle, not one low-level provider message.

### AssistantTurnEntry

Minimal target fields:

- `id`
- `conversationId`
- `sequence`
- `status: in_progress | completed | failed`
- `text`
- `startedAt`
- `completedAt?`
- `error?`
- `activities`
- `artifacts`
- `runtimeRefs`

### Activity

Minimal target fields:

- `id`
- `kind`
- `name`
- `label`
- `state: running | completed | failed`
- `inputSummary?`
- `outputSummary?`
- `startedAt`
- `completedAt?`

Examples:

- `read docs/vision.md`
- `find package.json`
- `write packages/runtime/...`
- `ask user to choose a workflow`

### Artifact

Not required for the first coding step, but the model should reserve the concept.

Later examples:

- user question form
- proposed workflow
- proposed tasks
- file preview

---

## Canonical Event Log

The canonical write model should move to an append-only event log.

Suggested event families:

- `conversation_created`
- `user_message_added`
- `assistant_turn_started`
- `assistant_text_appended`
- `activity_started`
- `activity_updated`
- `activity_completed`
- `artifact_emitted`
- `assistant_turn_completed`
- `assistant_turn_failed`

These are Hisse events, not Pi events.

They should be:

- stable
- product-readable
- runtime-agnostic
- compact enough to persist safely

Important rule:

- do not persist raw `write/edit` file contents in canonical events
- persist summaries, paths, counts, and safe metadata only

---

## Mapping From Pi To Hisse

Pi already gives enough signal to build the canonical Hisse event stream.

### From Pi message events

- assistant text delta -> `assistant_text_appended`
- final agent completion -> `assistant_turn_completed`
- execution error -> `assistant_turn_failed`

### From Pi tool lifecycle events

- `tool_execution_start` -> `activity_started`
- `tool_execution_update` -> `activity_updated`
- `tool_execution_end` -> `activity_completed`

### From raw Pi message content

Useful for repair and backfill:

- `toolCall` blocks
- `toolResult` messages
- final assistant `text`

The product must not depend on replaying raw Pi schema at read time.
But raw Pi data can be used:

- when projecting in real time
- when rebuilding old conversations
- when repairing corrupted projections

---

## Persistence Layout

Current layout is too centered on `transcript.jsonl`.

Target layout:

```text
.hisse/
  conversations/
    <conversationId>/
      conversation.json
      events.jsonl
      transcript.jsonl
      <pi-session>.jsonl
```

Meaning:

- `conversation.json`
  - metadata
- `events.jsonl`
  - canonical Hisse event log
- `transcript.jsonl`
  - read-optimized projection for simple transcript reads
- `<pi-session>.jsonl`
  - raw Pi technical session log

Notes:

- `events.jsonl` becomes the write-side truth
- `transcript.jsonl` becomes a projection, not the primary source
- Pi raw JSONL remains available exactly because it is richer than the transcript

---

## API And Streaming Direction

The NDJSON chat stream must evolve from plain text transport to execution-aware transport.

Current shape:

- `meta`
- `delta`
- `done`
- `error`

Target direction:

- `meta`
- `assistant_turn_started`
- `assistant_text_delta`
- `activity_started`
- `activity_updated`
- `activity_completed`
- `assistant_turn_completed`
- `assistant_turn_failed`

The UI should not infer tool activity from raw markdown.
It should receive explicit activity events.

---

## Frontend Direction

The assistant message area should evolve into a richer response container.

It should show:

- assistant text as it streams
- a live activity rail under or above the text
- future interactive artifacts in the same assistant turn boundary

The rendering model should become:

- one assistant turn container
- one text stream
- zero to many activities
- zero to many artifacts

This is the right boundary for:

- tool visibility now
- HITL next
- proposals later

---

## Compatibility Strategy

This evolution must stay compatible with Pi as the runtime engine.
It does not need to preserve the current local conversation history if we decide to reset it before rollout.

### Compatibility Principles

- do not delete or mutate raw Pi session files created by the new system
- keep the runtime boundary compatible with Pi
- keep the canonical model independent from Pi internal schema
- prefer a clean storage reset over a migration if that reduces complexity

### Reset Strategy

If we choose to restart from zero:

1. delete existing conversation directories
2. deploy the richer canonical model directly
3. generate only the new storage layout for all new conversations

This is the preferred rollout if we want to move fast and avoid migration code.

### Optional Backfill Strategy

If we later decide to recover old conversations:

1. load raw Pi session JSONL if present
2. project it into canonical Hisse events
3. rebuild `transcript.jsonl`
4. optionally persist the rebuilt canonical files

This remains possible because the raw Pi session is richer than the flat transcript.

---

## Incremental Refactor Plan

The refactor should stay incremental and safe.

### Phase 0 - Fix Request Completion Semantics

Goal:

- stop completing a conversation on the first assistant turn end

Work:

- treat the request lifecycle as complete only when the full agent run is complete
- ensure tool-driven runs persist the actual final assistant answer
- keep this as a bug fix, independent from the richer model

Why first:

- the current simplification breaks correctness for tool use

### Phase 1 - Expand Runtime Stream Contract

Goal:

- let the application receive execution-aware events

Work:

- extend `AgentStreamEvent`
- map Pi tool lifecycle events into Hisse stream events
- keep text deltas alongside activity events

Deliverable:

- the backend can observe what the assistant is doing in real time

### Phase 2 - Introduce Canonical Event Log

Goal:

- stop using `transcript.jsonl` as the only canonical write model

Work:

- add `events.jsonl`
- define the Hisse canonical chat events
- append canonical events during execution

Deliverable:

- a domain-owned, replayable product event log

### Phase 3 - Build Transcript Projection

Goal:

- preserve simple reads while moving to richer writes

Work:

- build `transcript.jsonl` as a projection from canonical events
- keep current chat list and transcript read APIs working

Deliverable:

- backward-compatible transcript reads

### Phase 4 - Add Assistant Activity Projection

Goal:

- expose tool activity as product data

Work:

- project canonical events into assistant turn activities
- expose them in `GetConversation`
- expose them in the NDJSON stream

Deliverable:

- the frontend can render "read", "find", "write", "ask user", etc.

### Phase 5 - Frontend Activity UI

Goal:

- show users what is happening while the agent works

Work:

- add an assistant turn container in the chat UI
- render activities live
- keep markdown text rendering for assistant text

Deliverable:

- live, trustworthy execution feedback in chat

### Phase 6 - Prepare HITL And Artifacts

Goal:

- avoid redesigning the model again when HITL lands

Work:

- add artifact and user-input concepts to the domain and stream contracts
- keep UI rendering hooks ready, even if only tool activity is shipped first

Deliverable:

- a stable base for `AskUserQuestions`, proposals, and file previews

---

## Immediate Launch Scope

The first implementation slice should stay narrow.

What we should do now:

1. fix request completion semantics for tool-based runs
2. extend the runtime stream with activity events
3. persist a canonical event log
4. project a minimal assistant activity timeline
5. render that timeline in the chat UI

What we should not do in the first slice:

- full HITL product UI
- rich artifact rendering
- migration of old conversations
- editing Pi raw session files
- persisting raw tool payloads verbatim in the canonical model

---

## Definition Of Done

This plan is considered implemented when all of the following are true:

- a tool-using assistant run persists the real final answer
- the user can see live tool activity in the chat UI
- the conversation can be reloaded without reading Pi state directly
- Hisse owns a canonical event log richer than flat transcript lines
- raw Pi JSONL remains available for audit and repair

---

## Summary

The direction is not:

- "store Pi messages directly"

The direction is:

- "own a richer Hisse conversation model that is compatible with Pi raw traces"

This keeps the right boundary:

- Pi is execution
- Hisse is product state

And it gives us a path that cleanly supports:

- visible tool activity now
- canonical replay next
- HITL and rich artifacts after that
