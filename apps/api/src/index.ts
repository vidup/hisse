import { fileURLToPath } from "node:url";

import cors from "@fastify/cors";
import Fastify from "fastify";

import {
  CreateAgentCommand,
  CreateAgentCommandHandler,
  GetAgentsQuery,
  GetAgentsQueryHandler,
  JsonlAgentRepository,
} from "@hisse/runtime";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

const repository = new JsonlAgentRepository(
  fileURLToPath(new URL("../../../.hisse/agents.jsonl", import.meta.url)),
);
const getAgents = new GetAgentsQueryHandler(repository);
const createAgent = new CreateAgentCommandHandler(repository);

const MODELS = [
  { id: "anthropic/claude-opus-4-6", provider: "anthropic", label: "Claude Opus 4.6" },
  { id: "anthropic/claude-sonnet-4-20250514", provider: "anthropic", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-haiku-4-5", provider: "anthropic", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-5", provider: "openai", label: "GPT-5" },
  { id: "openai/gpt-5-mini", provider: "openai", label: "GPT-5 Mini" },
  { id: "openai/gpt-4o", provider: "openai", label: "GPT-4o" },
  { id: "google/gemini-2.5-pro", provider: "google", label: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash", provider: "google", label: "Gemini 2.5 Flash" },
] as const;

type Provider = "anthropic" | "openai" | "google" | "custom";

interface CreateAgentBody {
  name?: unknown;
  description?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
}

app.get("/api/health", async () => ({
  status: "ok",
  service: "hisse-api",
  timestamp: new Date().toISOString(),
}));

app.get("/api/models", async () => ({ items: MODELS }));

app.get("/api/agents", async () => {
  const items = await getAgents.execute(new GetAgentsQuery());
  return {
    items: items.map((agent) => agent.data),
  };
});

app.post<{ Body: CreateAgentBody }>("/api/agents", async (request, reply) => {
  const body = parseCreateAgentBody(request.body);
  const provider = parseProviderFromModel(body.model);

  const created = await createAgent.execute(
    new CreateAgentCommand(
      body.name,
      body.systemPrompt,
      body.model,
      provider,
      body.description,
    ),
  );

  reply.code(201);
  return { item: created.data };
});

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

function parseCreateAgentBody(body: CreateAgentBody) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : undefined;
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";

  if (!name) throw badRequest("name is required");
  if (!model) throw badRequest("model is required");
  if (!systemPrompt) throw badRequest("systemPrompt is required");

  return { name, description, model, systemPrompt };
}

function parseProviderFromModel(model: string): Provider {
  const prefix = model.split("/")[0];
  if (prefix === "anthropic" || prefix === "openai" || prefix === "google") {
    return prefix;
  }
  return "custom";
}

function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}
