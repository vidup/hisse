# Chatbot Architecture

> Target architecture for the Hisse chat system.
> Hisse owns the canonical chat model.
> Pi executes prompts and keeps a raw technical transcript.

---

## Goal

The chat system must allow Hisse to:

- start a conversation with an agent
- send messages in an existing conversation
- stream the assistant response to the UI
- reload a conversation without reading Pi internal state
- keep raw Pi traces for audit, debugging, and repair

The goal is not to duplicate all Pi internals.
The goal is to own a stable product chat model while still using Pi as the execution engine.

---

## Main Decision

The retained architecture is:

- `Conversation` is the chat aggregate root
- `Message` is an entity inside `Conversation`
- the write side exposes one `ConversationRepository`
- Hisse owns the canonical transcript shown by the product
- Pi remains an execution engine and raw provider transcript

Important consequence:

- aggregate boundary and storage format are different decisions
- infra may store conversation metadata, canonical transcript, and raw Pi transcript separately
- the UI always reads the canonical Hisse transcript, never Pi runtime state directly

---

## Current Simplification

For the current version, the canonical persistence model stays deliberately simple.

- the user message is persisted immediately
- assistant deltas are streamed to the client but kept only in memory on the server
- when the stream finishes, one assistant message is persisted with status `completed`
- if the stream fails, one assistant message is persisted with status `failed` and the partial content accumulated so far
- no canonical persistence of streaming deltas

This gives a simpler implementation while keeping a coherent transcript.

Tradeoff:

- if the process crashes brutally before `done` or handled `error`, the partial assistant text kept only in memory is lost
- if crash-proof replay becomes a requirement later, we can move to a richer event log without changing the product boundary

---

## Responsibility Boundary

### Hisse owns

- `Conversation`
- `Message`
- message ordering
- canonical message status
- UI-facing chat history

### Pi owns

- prompt execution
- provider session lifecycle
- raw stream events
- provider-specific technical data

### Application bridges both worlds

The application layer:

- persists canonical user messages
- consumes Pi stream events
- streams deltas to the UI
- materializes one canonical assistant message at the end of the request

The domain does not read Pi JSON directly.

---

## Canonical Model

The canonical model should stay intentionally small.

### Conversation

`Conversation` is the aggregate root.

Current minimal fields:

- `id`
- `title`
- `agentId`
- `createdAt`
- `updatedAt`
- `messages`

Responsibilities:

- contain the canonical message history
- guarantee message ordering
- act as the only write-side consistency boundary for chat

### Message

`Message` is an entity of `Conversation`.

Current minimal fields:

- `id`
- `conversationId`
- `role`
- `sequence`
- `contentText`
- `status`
- `createdAt`
- `completedAt`
- `error?`
- `providerMessageRef?`

Current message statuses:

- `completed`
- `failed`

For this version, `contentText: string` is enough.
If the product later needs attachments, citations, visible tool calls, or richer blocks, the canonical payload can evolve then.

---

## Aggregate And Repository

`Conversation` is the aggregate root, but that does not imply monolithic storage.

Principle:

- `Conversation` defines the consistency boundary
- `ConversationRepository` exposes that boundary
- infrastructure is free to split or reshape storage behind it

Recommended domain port:

```ts
interface ConversationRepository {
  findById(id: ConversationId): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}
```

Why not a separate `MessageRepository` on the write side:

- messages only make sense inside a conversation
- ordering is a conversation invariant
- exposing message writes separately would weaken the aggregate boundary

So the domain has one write-side repository: `ConversationRepository`.

---

## Domain Invariants

The `Conversation` aggregate should protect at least these invariants:

- a message belongs to exactly one conversation
- message sequence is strictly increasing inside a conversation
- conversation `updatedAt` reflects the latest canonical transcript mutation
- canonical messages are append-only for this version

What is deliberately *not* persisted in the domain right now:

- in-flight assistant streaming state
- per-delta persistence

That state lives in the application flow, not in the canonical transcript.

---

## Runtime Port

The runtime contract should stay minimal and stable.

```ts
type AgentStreamEvent =
  | { type: "text_delta"; content: string }
  | { type: "done"; fullContent: string }
  | { type: "error"; error: string };

interface AgentRuntime {
  createSession(params: {
    sessionId: string;
    systemPrompt: string;
    provider: string;
    model: string;
  }): Promise<AgentSessionHandle>;

  resumeSession(sessionId: string): Promise<AgentSessionHandle>;
}
```

Pi runtime is an execution adapter.
It is not the chat read model.

---

## Canonical Persistence

The canonical Hisse transcript is the product source of truth.

Current storage layout:

```text
.hisse/
  conversations/
    <conversationId>/
      conversation.json
      transcript.jsonl
      providers/
        pi/
          <session>.jsonl
```

Meaning:

- `conversation.json` stores conversation metadata
- `transcript.jsonl` stores the canonical Hisse transcript
- `providers/pi/*.jsonl` stores the raw Pi transcript

Important choice:

- `transcript.jsonl` is one line per canonical message
- it is not a delta log in the current version

Example canonical transcript lines:

```json
{"id":"msg-1","conversationId":"conv-1","role":"user","sequence":1,"contentText":"@coder help me","status":"completed","createdAt":"...","completedAt":"..."}
{"id":"msg-2","conversationId":"conv-1","role":"assistant","sequence":2,"contentText":"Sure, here is a plan.","status":"completed","createdAt":"...","completedAt":"..."}
{"id":"msg-3","conversationId":"conv-1","role":"assistant","sequence":4,"contentText":"Partial answer","status":"failed","createdAt":"...","completedAt":"...","error":"Provider timeout"}
```

---

## Request Flow

### Start conversation

1. Resolve the agent from the first message.
2. Create `Conversation`.
3. Append and persist the user message immediately.
4. Create the Pi session.
5. Stream assistant deltas to the client while accumulating text in memory.
6. On `done`, append one canonical assistant message with status `completed` and persist.
7. On handled `error`, append one canonical assistant message with status `failed`, including partial content, and persist.

### Send message

1. Load `Conversation` from `ConversationRepository`.
2. Append and persist the user message immediately.
3. Resume the Pi session.
4. Stream assistant deltas to the client while accumulating text in memory.
5. Persist one assistant message on `done` or `error`.

### Read conversation

`GetConversation` reads only:

- `conversation.json`
- `transcript.jsonl`

It never rebuilds the chat from Pi runtime state.

---

## Raw Pi Transcript

The raw Pi transcript is still valuable, but it is not the product source of truth.

Its purpose is:

- audit
- debugging
- repair
- migration
- low-level forensic analysis

It may contain:

- raw Pi events
- provider metadata
- signatures
- token usage
- provider-specific data we do not want in the canonical model

---

## What To Avoid

- reading messages from Pi runtime state to serve the UI
- exposing a domain-level `MessageRepository` that bypasses `Conversation`
- persisting canonical deltas when a final message is enough for the current product needs
- leaking the full Pi schema into the domain
- making chat reload depend on successful Pi session resumption

---

## Consequences For The Current Code

This architecture implies:

- `Conversation` remains the single write-side boundary
- `FsConversationsRepository` owns `conversation.json` and `transcript.jsonl`
- chat queries read the canonical Hisse transcript
- Pi runtime is used only for execution and streaming
- assistant streaming state stays transient in the application layer

In short:

- Pi knows how to execute
- Hisse knows how to represent

---

## Refactor Plan

The refactor should stay incremental.

### Phase 1 - Canonical Domain

Goal:

- make `Conversation` the aggregate root
- add canonical `Message`

Work:

- keep message ordering inside `Conversation`
- avoid a separate write-side `MessageRepository`

### Phase 2 - Canonical Storage

Goal:

- persist Hisse-owned chat state independently of Pi

Work:

- store metadata in `conversation.json`
- store canonical messages in `transcript.jsonl`
- keep raw Pi files under `providers/pi/`

### Phase 3 - Canonical Reads

Goal:

- reload chats only from canonical Hisse storage

Work:

- make `GetConversation` read only `ConversationRepository`
- remove any dependency on Pi runtime state for chat reload

### Phase 4 - Simplified Streaming Writes

Goal:

- keep stream transport simple without persisting deltas

Work:

- persist the user message immediately
- accumulate assistant content in memory during streaming
- persist one assistant message on `done`
- persist one failed assistant message with partial content on handled `error`

### Phase 5 - API And Frontend Cleanup

Goal:

- make the transport protocol explicit and coherent

Work:

- stream deltas to the client with NDJSON over `fetch` POST
- handle `done` and `error` explicitly
- keep the client render path decoupled from canonical persistence details

---

## Definition Of Done

The refactor is complete when all of the following are true:

- a conversation can be reloaded without reading Pi internal runtime state
- the canonical Hisse transcript contains every message shown by the UI
- `Conversation` remains the only write-side repository boundary
- assistant deltas are transport details, not canonical persisted data
- handled provider failures produce a coherent failed assistant message with partial content
- raw Pi transcript remains available for audit and repair

---

## Possible Future Evolution

If the product later needs stronger crash recovery or replay, we can extend the canonical storage to an event log.

Possible future events:

- `conversation_created`
- `user_message_added`
- `assistant_message_started`
- `assistant_delta_appended`
- `assistant_message_completed`
- `assistant_message_failed`

That would be a later evolution.
For the current version, `conversation.json` + `transcript.jsonl` with one line per final message is the simpler and better fit.
