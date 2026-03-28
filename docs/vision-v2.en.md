# Hisse — Vision v2

> A platform for orchestrating hybrid work. Agentic when needed, workflow when needed, automation when needed. Or all three at once.

---

## Intuition

The future of software work is probably neither:

- a world of **fully hard-coded workflows** where everything is fixed in advance,
- nor a world of **fully autonomous agents** where we launch agents and sub-agents and hope everything converges in the end.

The useful reality lies somewhere in between.

Agents can already do a lot: explore, synthesize, search, write, propose, and adapt their strategy from one run to the next.
But they still have limits: uneven reliability, difficulty handling implicit constraints, frequent need for validation, and brittleness on long or critical tasks.

Hisse starts from a simple observation:

> we need to be able to **compose different degrees of autonomy** instead of choosing between rigid workflows and autonomous agents.

---

## The core thesis

Hisse is not just a workflow tool for agents.
Hisse is not just a chat runtime for agents.
Hisse is not just an automation engine.

Hisse aims to be a **combinatorial platform** that lets you mix:

- **free-form chat** with an agent,
- **explicit workflows**,
- **human steps**,
- **agentic steps**,
- **deterministic automation steps**,
- and potentially **multi-agent steps** in the future.

The goal is not to put everything into a workflow.
The goal is not to hand everything over to the agent either.

The goal is to provide a framework where, for each use case, you can decide:

- where to allow freedom,
- where to impose control,
- where to require human validation,
- where to automate strictly,
- and where to combine several of these logics.

---

## Why workflows still matter

Tools like Linear or Jira are good at orchestrating human work, but they were not designed for agents.
Conversely, some agent harnesses implicitly follow a pattern like this:

- give a mission to an agent,
- let the agent spawn sub-agents,
- then hope the final result is good.

That approach can be impressive, but it becomes insufficient as soon as you need:

- control,
- traceability,
- validation points,
- rollback,
- recovery,
- coordination with humans,
- minimum guarantees on outputs.

So workflows are still necessary to **frame** the work.
But in Hisse, they are not there to describe every detail of behavior.

> We do not want to hard-code the agent’s work. We want to hard-code the frame in which the agent works.

---

## Why agentic behavior still matters

Traditional workflow tools like n8n or Zapier are excellent when everything is known in advance.
But they quickly become rigid when you need exploration or adaptation.

And that is precisely what agents bring:

- useful variability,
- contextual research,
- the ability to find relevant information,
- adaptation to imperfect inputs,
- local initiative,
- execution that is not strictly identical from one run to the next.

Reducing an agent to a simple brick inside an overly deterministic workflow means losing a large part of its value.

Hisse therefore wants to preserve that power:

- sometimes in a simple chat,
- sometimes inside a workflow step,
- sometimes across an entire mission,
- and later perhaps in collaboration between several agents.

---

## The right model: degrees of autonomy

Hisse’s central idea is this:

> an organization does not need a single mode of execution; it needs a system that lets it tune the level of autonomy.

Examples:

### Free-form chat

A user talks to an agent in the context of a workspace, a project, or a task.
The agent acts freely, in a cowork-like experience.

### Lightweight workflow

A very simple mission goes through only a few steps.
Example: intake, triage, qualification, enrichment, dispatch.

### Structured workflow

A task goes through an explicit sequence of steps: spec, code, review, ship.
Some steps are agentic, others are human.

### Hybrid workflow

The workflow structures the work, but each step still gives the agent real room to act.

### Strict automation

A non-agentic step runs deterministic code to control, validate, route, or reject a result.

---

## A third building block: deterministic automation

Between classic workflows and agents, there is a third very important logic:
**strict automation**.

A workflow step does not have to be:

- human,
- or driven by an LLM.

It can be a piece of executable logic that checks invariants or makes a simple decision.

Examples:

- if a given file is missing, send the task back to the previous step,
- if tests fail, send it back,
- if the brief is incomplete, reject it,
- if an expected structure is missing, block it,
- if a deliverable does not match the required format, trigger automatic rework.

This is a meaningful difference from systems that can only “influence” the agent through prompts or hooks.

Hisse aims to do more than advise the model:

> at certain steps, the system must be able to **enforce control explicitly**.

This makes it possible to combine:

- probabilistic intelligence,
- deterministic validation,
- automated rework loops,
- and human intervention only when it is actually useful.

---

## A platform, not a locked product

The model and runtime ecosystem is moving extremely fast.
Being trapped in a single provider, a single model, or a single harness quickly becomes a liability.

So Hisse starts from a different assumption:

> anything that depends on a contingent technology choice must be replaceable.

That applies to:

- **providers**,
- **models**,
- **agent runtimes**,
- **tools**,
- **transports**,
- **step types**,
- **external connectors**,
- and potentially, in the future, **orchestration policies**.

One agent may be excellent with one model for coding.
Another may be better with a different model for analysis.
A team may want to mix several providers.
One task may justify a different setup from another.

Hisse wants to make this possible by design, rather than making it hard or impossible.

---

## Agents as configurable objects

In that model, agents become configurable and composable objects.
They are not inherently tied to a single runtime or a single provider.

Depending on the need, an agent should be able to define:

- its role,
- its system prompt,
- its model,
- its provider,
- its tools,
- its skills,
- potentially its execution runtime in the future,
- and potentially its collaboration policies with other agents.

The inspiration is somewhat similar to a Dust-style agent registry, but pushed toward greater technical openness and deeper integration with real execution.

---

## Pluggable runtimes

Today Hisse may rely on Pi.
Tomorrow, it should be able to rely on something else.

The goal is not to deny the value of Pi or any other runtime.
The goal is to keep an architecture that can evolve with the ecosystem.

Tomorrow, depending on context, we may want to use:

- Pi,
- Claude Code,
- Codex,
- Gemini CLI,
- OpenCode,
- or other runtimes that do not exist yet.

The runtime is therefore a **port**, not an absolute truth.

The same applies to execution-time capabilities:

- native tools,
- custom tools,
- MCP,
- local or cloud capabilities,
- all of these should be pluggable, replaceable, and combinable.

---

## Pluggable transports

The same reasoning applies to human interaction.

A human step should not be tied to a single channel.
Depending on the team, the context, and the urgency, we may want:

- a local OS notification,
- Slack,
- Discord,
- Telegram,
- WhatsApp,
- email,
- Notion,
- Jira,
- or several transports at once.

The same step may need to:

- notify someone on Slack,
- create an artifact in Jira,
- post a summary in Notion,
- and keep a local trace in the application.

Transport is therefore not just an implementation detail.
It is an important business capability.

---

## Filesystem-first, but not filesystem-only

Today, the filesystem is an excellent foundation because it provides:

- inspectability,
- versioning,
- portability,
- hackability,
- natural integration with Git.

So it is a very good default for:

- skills,
- agents,
- workflows,
- projects,
- transcripts,
- deliverables.

But Hisse should not lock its vision into Git or even into the local filesystem.

Over time, we can imagine:

- cloud-backed chat storage,
- shared team spaces,
- private or public chats,
- Jira synchronization,
- SharePoint documents,
- other persistence backends,
- other collaboration surfaces.

So the right principle is not “everything must live on disk forever.”
The right principle is:

> choose abstractions that keep multiple persistence and collaboration models open.

The filesystem remains an excellent default.
It must not become a conceptual prison.

---

## Architecture: do not close doors too early

Hisse’s broader philosophy can be summarized like this:

- do not assume a single execution model will be enough,
- do not assume a single provider will remain the best,
- do not assume a single human channel will suit every team,
- do not assume a single storage backend will last,
- do not assume a single step type is enough to model reality.

In other words:

> keep doors open wherever the ecosystem is still moving.

That is exactly what a pluggable hexagonal architecture enables:

- a clear business domain,
- stable ports,
- replaceable adapters,
- composable catalogs,
- a platform that absorbs change instead of suffering from it.

---

## Positioning

Hisse is not:

- a Jira for humans with a bit of AI,
- a Zapier enhanced with LLMs,
- a closed autonomous cowork product tied to a single provider,
- a simple agent chat,
- or a single execution runtime.

Hisse aims to be:

> an open platform for orchestrating hybrid work, where agents, humans, automation, and external integrations can be combined with the right level of structure for each context.

---

## In practice

Hisse should support all of the following:

- free-form chat in the context of a project,
- a very simple auto-mission workflow,
- a structured production pipeline,
- an automation step that controls outputs,
- execution based on multiple providers,
- human interactions through different transports,
- and, later, richer team setups that are shared or synchronized with other systems.

---

## Summary

Hisse’s vision is simple to state, even if it is ambitious to build:

> give teams a system for orchestrating degrees of autonomy.

That means being able to combine:

- agentic freedom,
- explicit workflow,
- deterministic control,
- human intervention,
- and interchangeable technical components.

In short:

> Hisse is neither a classic workflow engine nor just an agent harness.
> It is an open platform for making agentic systems truly usable in real work.
