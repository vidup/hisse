# Chatbot Architecture

> Target architecture for the Hisse chat system.
> Hisse owns the product chat model.
> Pi is an execution engine and a raw transcript provider.

---

## Goal

The chat system must allow Hisse to:

- start a conversation with an agent
- send messages in an existing conversation
- stream the assistant response
- reload a conversation without depending on provider internal state
- keep raw provider traces for audit, debugging, and repair

The goal is not to replicate all Pi internals.
The goal is to own a stable product model for chat while still benefiting from Pi for execution and raw transcripts.

---

## Main Decision

The main architectural decision is:

- `Conversation` is the chat aggregate root
- `Message` is an entity inside `Conversation`
- Hisse owns the canonical chat model
- Pi executes the conversation and produces a raw provider transcript

As a consequence:

- the write side exposes one `ConversationRepository`
- there is no separate `MessageRepository` as the main domain port
- physical storage may still be split across conversation metadata, canonical messages, and raw provider transcript
- UI queries read the canonical Hisse model, never Pi internal state directly

---

## Why This Direction

This design resolves the tension between two valid goals:

- avoid duplicating Pi logic and storage for no reason
- avoid making the product depend on Pi internal formats or state

Pi can remain the low-level technical truth for:

- raw events
- signatures
- reasoning
- token usage
- provider-specific references

Hisse must own the product truth for:

- which conversations exist
- which user and assistant messages exist
- message ordering
- message status
- what the UI renders
- what can be searched, filtered, repaired, or replayed

Rule of thumb:

- if Hisse displays or reasons about it durably, it belongs to the canonical Hisse model
- if it is only provider-specific, debug-oriented, or compatibility-oriented, it stays in the raw provider transcript

---

## Responsibility Boundary

### Hisse owns

- `Conversation`
- `Message`
- message ordering
- conversation status
- message status
- UI-facing chat data

### Pi owns

- prompt execution
- provider session lifecycle
- raw streaming events
- detailed technical transcript

### Application and adapter bridge both worlds

The application and runtime adapter translate:

- Pi events into normalized runtime events
- normalized runtime events into mutations on the Hisse canonical chat model

The domain does not read Pi JSON directly.
The domain manipulates conversations and messages.

---

## Canonical Model

The canonical model should stay intentionally small at first.

### Conversation

`Conversation` is the aggregate root.

Minimal fields:

- `id`
- `agentId`
- `title`
- `status`
- `createdAt`
- `updatedAt`
- `providerSessionRef?`

Responsibilities:

- contain the canonical message history
- guarantee message ordering
- guarantee that only one assistant message is streaming at a time
- carry global conversation state transitions

### Message

`Message` is an entity of `Conversation`.

Minimal fields:

- `id`
- `conversationId`
- `role`
- `sequence`
- `contentText`
- `status`
- `createdAt`
- `completedAt?`
- `error?`
- `providerMessageRef?`

At the beginning, `contentText: string` is enough.

If the product later needs to display:

- structured content
- attachments
- citations
- visible tool calls
- rich blocks

then the canonical model can evolve to a structured payload.
That does not justify leaking the full Pi schema into the domain now.

---

## Aggregate And Repository

Aggregate choice does not imply monolithic storage.

Principle:

- `Conversation` defines the consistency boundary
- `ConversationRepository` exposes that boundary
- infrastructure is free to split storage behind it

### Recommended domain port

```ts
interface ConversationRepository {
  findById(id: ConversationId): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}
```

### Why not a separate MessageRepository

A separate domain-level `MessageRepository` would allow bypassing conversation invariants:

- append a message outside a conversation lifecycle
- break sequence ordering
- create multiple streaming assistant messages
- persist an invalid message state directly

Messages only make sense inside a conversation.
The important invariants live at conversation level.
That is why `Conversation` should remain the write-side boundary.

---

## Domain Invariants

The `Conversation` aggregate should protect at least these invariants:

- a message belongs to exactly one conversation
- message sequence is strictly increasing inside a conversation
- a new assistant streaming message cannot start while another is still open
- a `completed`, `failed`, or `cancelled` message no longer accepts deltas
- conversation `updatedAt` reflects the latest canonical transcript mutation
- a closed conversation cannot receive new messages

These invariants are domain concerns.
They must not depend on Pi.

---

## Runtime Port

The runtime contract should stay minimal and stable.

```ts
type ChatRuntimeEvent =
  | { type: "text_delta"; delta: string }
  | { type: "done" }
  | { type: "error"; error: string };

interface ChatRuntime {
  createSession(params: {
    conversationId: string;
    systemPrompt: string;
    provider: string;
    model: string;
  }): Promise<void>;

  resumeSession(conversationId: string): Promise<void>;

  prompt(conversationId: string, input: string): AsyncIterable<ChatRuntimeEvent>;
}
```

The runtime does not expose Pi internal message state as a product read model.

---

## Raw Provider Transcript

The raw provider transcript should be stored as-is in infrastructure.

Examples of raw data:

- Pi events
- signatures
- reasoning
- token usage
- provider metadata

Its purpose is:

- audit
- debugging
- repair
- migration
- low-level forensic analysis

It is not the UI source of truth.

### Possible infra port

```ts
interface ProviderTranscriptStore {
  append(conversationId: string, rawEvent: unknown): Promise<void>;
  read(conversationId: string): Promise<unknown[]>;
}
```

This is an infra concern, not the main domain repository.

---

## Canonical Projection

The canonical Hisse transcript is the product truth.

Pi produces raw events, then the application:

- creates or resumes the conversation
- appends the user message
- creates a streaming assistant message
- folds `text_delta` chunks into assistant canonical content
- finalizes the message as `completed` or `failed`

That projection must be persisted during the flow.
Reloading a conversation must not depend on reconstructing it from provider state.

---

## Storage Layout

Physical storage can be split without exposing multiple write-side repositories.

Recommended structure:

```text
.hisse/
  conversations/
    <conversationId>/
      conversation.json
      messages/
        000001_<messageId>.json
        000002_<messageId>.json
      providers/
        pi/
          <session>.jsonl
```

Meaning:

- `conversation.json` stores conversation metadata
- `messages/*` stores the canonical Hisse transcript
- `providers/pi/*` stores the raw provider transcript

`ConversationRepository` is free to use this structure internally.

---

## Query Side

The read side can stay pragmatic.

Recommendations:

- UI queries read the canonical Hisse transcript
- conversation lists can stay optimized independently
- filtering and search can live in query services

Having one repository on the write side does not prevent separate query services on the read side.

---

## What To Avoid

- reading messages from Pi internal runtime state to serve the UI
- exposing a domain-level `MessageRepository` that bypasses `Conversation`
- modeling the full Pi schema in the domain preemptively
- making the raw provider transcript the product source of truth
- making chat reload depend on successful provider session resumption

---

## Concrete Decisions

The retained architecture decisions are:

- `Conversation` is the aggregate root of chat
- `Message` is an entity of `Conversation`
- the write side exposes one `ConversationRepository`
- the canonical Hisse transcript is the product source of truth
- Pi remains the execution engine and raw technical transcript
- raw Pi data is preserved in infrastructure
- queries read the canonical Hisse model
- the canonical message payload can evolve later if the product truly needs structured content

---

## Consequence For Existing Code

This target direction implies:

- stop reloading chat from provider runtime state
- move transcript reconstruction into Hisse canonical persistence
- make Pi runtime a streaming adapter, not a message repository
- persist the canonical transcript explicitly

In short:

- Pi knows how to execute
- Hisse knows how to represent

That is the responsibility boundary we want.

---

## Refactor Plan

The refactor should stay incremental.
The goal is not to rewrite the whole chat stack at once, but to move the source of truth toward Hisse with controlled steps.

Recommended sequence:

1. introduce the canonical Hisse transcript
2. make queries read from the canonical transcript
3. make commands write the canonical transcript during streaming
4. reduce Pi runtime to execution concerns
5. simplify API and frontend afterwards

---

## Phase 1 - Domain And Ports

Goal:

- introduce the canonical chat model
- prepare one write-side repository centered on `Conversation`

Files to change:

- `packages/runtime/domain/model/conversation.ts`
- `packages/runtime/domain/ports/conversations.repository.ts`
- `packages/runtime/index.ts`

Files to add:

- `packages/runtime/domain/model/message.ts`

Expected work:

- enrich `Conversation` so it owns its `Message` entities
- introduce `Message`, `MessageRole`, and `MessageStatus`
- add aggregate methods
- keep one domain repository interface for conversation persistence

Recommended aggregate methods:

- `addUserMessage(content: string): Message`
- `startAssistantMessage(): Message`
- `appendAssistantDelta(messageId: string, delta: string): void`
- `completeAssistantMessage(messageId: string): void`
- `failAssistantMessage(messageId: string, error: string): void`
- `touch(): void`

Important note:

- the domain port must not expand into multiple write-side repositories
- infra can still store conversation metadata, messages, and provider transcript separately

---

## Phase 2 - Canonical Persistence

Goal:

- make Hisse able to reload a conversation on its own
- keep Pi raw transcripts in parallel

Files to change:

- `packages/runtime/infrastructure/fs-conversations.repository.ts`
- `adapters/api/src/workspace.ts`

Expected work:

- evolve `FsConversationsRepository` so it reads and writes:
  - `conversation.json`
  - `messages/*.json`
- keep raw Pi transcript under a technical subdirectory
- rebuild `Conversation` from canonical Hisse storage

Implementation decisions:

- `FsConversationsRepository` stays the only write-side repository
- storing messages in separate files does not justify a separate domain `MessageRepository`

Practical notes:

- `findAll()` can stay light and load only `conversation.json`
- `findById()` should load `conversation.json` and `messages/*`
- ordering must rely on `sequence`, not only on filesystem order

---

## Phase 3 - Pi Runtime As Adapter

Goal:

- reduce Pi runtime to execution and streaming
- remove its role as a message read model

Files to change:

- `packages/runtime/domain/ports/agent-runtime.ts`
- `packages/runtime/infrastructure/pi-agent-runtime.ts`
- `packages/runtime/index.ts`

Expected work:

- keep a minimal runtime contract around `text_delta`, `done`, and `error`
- stop using Pi as the source for UI-visible messages
- remove or demote `getMessages()` as a product-facing concern

Pi runtime should:

- create a session
- resume a session
- execute a prompt
- return normalized stream events

Pi runtime should not:

- act as an implicit message repository
- expose `session.agent.state.messages` to application code as the chat read model

Acceptable transition:

- keep `getMessages()` temporarily during migration
- remove all application usage of it before the refactor is considered complete

---

## Phase 4 - Chat Commands

Goal:

- write the canonical Hisse transcript during the stream
- enforce chat invariants through `Conversation`

Files to change:

- `packages/runtime/application/chat/start-conversation.command.ts`
- `packages/runtime/application/chat/send-message.command.ts`

Expected work in `StartConversationCommandHandler`:

- resolve the agent
- compute the title
- create the conversation
- append the user message to the aggregate
- create the Pi session
- start a streaming assistant message
- fold incoming deltas into the assistant message
- finalize as `completed` or `failed`
- save the conversation at the right moments

Expected work in `SendMessageCommandHandler`:

- load the conversation from `ConversationRepository`
- validate conversation invariants
- append the user message
- resume the Pi session
- start a streaming assistant message
- fold deltas
- finalize and save

Consistency decision:

- `skillContext` must either be actually applied or be explicitly removed from the flow
- it must not stay computed but ignored

Robustness decision:

- runtime errors must mark the assistant message as `failed`
- we should not return an apparently empty conversation by silently swallowing provider failures

---

## Phase 5 - Chat Queries

Goal:

- make reads depend only on the canonical Hisse model

Files to change:

- `packages/runtime/application/chat/get-conversation.query.ts`
- `packages/runtime/application/chat/get-conversations.query.ts`

Expected work:

- `GetConversationQueryHandler` reads only from `ConversationRepository`
- returned messages come from the canonical Hisse transcript
- `GetConversationsQueryHandler` stays based on conversation metadata

Expected result:

- reloading a conversation no longer depends on a live Pi session
- UI reads remain stable even if the provider changes or raw transcripts need repair later

---

## Phase 6 - HTTP API

Goal:

- make the streaming protocol explicit and coherent
- keep routes thin

Files to change:

- `adapters/api/src/routes/chat.routes.ts`

Expected work:

- keep streaming deltas to the client
- make the route a bridge between runtime and canonical conversation handling
- avoid introducing a second hidden source of truth in the route layer

Recommended decision:

- either keep SSE and parse event types correctly on the client
- or switch to NDJSON over `fetch` if that simplifies the flow

In both cases:

- the route must not reconstruct conversation state
- the route must not carry hidden business rules
- `done` and `error` must have clear semantics

---

## Phase 7 - Web Client

Goal:

- consume a stable canonical transcript
- stop relying on implicit streaming conventions

Files to change:

- `clients/web/src/lib/api.ts`
- `clients/web/src/hooks/use-chat.ts`
- `clients/web/src/pages/chat/chat-page.tsx`

Expected work:

- parse the chosen stream protocol correctly
- render the in-flight assistant message from the stream
- reload the conversation from the canonical model after stream completion
- handle stream errors explicitly
- prepare future cancellation through `AbortController`

Logic cleanup:

- if the backend sends `conversationId` early in the stream, the client should use it immediately
- otherwise the protocol should be simplified and that meta event removed

---

## Safest Implementation Order

Recommended order to minimize regressions:

1. introduce `Message` and enrich `Conversation`
2. evolve `FsConversationsRepository`
3. make `GetConversationQueryHandler` read canonical storage
4. update `StartConversationCommandHandler`
5. update `SendMessageCommandHandler`
6. simplify `PiAgentRuntime`
7. adjust API routes
8. adjust frontend

This sequence gives an early important win:

- chat reads stop depending on Pi runtime state

Then, in a second step:

- chat writes become fully canonical on the Hisse side

---

## Definition Of Done

The refactor can be considered complete when all of the following are true:

- a conversation can be reloaded without reading Pi internal runtime state
- the canonical Hisse transcript contains every message shown by the UI
- `Conversation` remains the single write-side domain boundary
- Pi no longer acts as an implicit message repository
- provider failures produce an explicit and coherent canonical chat state
- raw Pi transcript remains available for audit and repair

---

## Optional Work After The Main Refactor

After the main refactor stabilizes, the following improvements become easier:

- client and server stream cancellation
- interrupted generation recovery
- provider metadata stored per message
- full-text search on canonical messages
- migration from `contentText` to structured content if the product truly needs it
