import { randomUUID } from "node:crypto";

import cors from "@fastify/cors";
import Fastify from "fastify";

interface AgentProfile {
  id: string;
  name: string;
  rolePrompt: string;
  tools: string[];
  skills: string[];
  createdAt: string;
}

interface CreateAgentBody {
  name?: unknown;
  rolePrompt?: unknown;
  tools?: unknown;
  skills?: unknown;
}

const agents: AgentProfile[] = [
  {
    id: "brainstorm-agent",
    name: "Brainstorm Agent",
    rolePrompt:
      "Aide à explorer un problème, clarifier des idées et proposer des pistes de solution.",
    tools: ["read", "bash", "hisse_project", "hisse_task"],
    skills: ["brainstorming", "product-discovery"],
    createdAt: new Date().toISOString(),
  },
];

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/api/health", async () => ({
  status: "ok",
  service: "hisse-api",
  timestamp: new Date().toISOString(),
}));

app.get("/api/agents", async () => ({
  items: agents,
  count: agents.length,
}));

app.post<{ Body: CreateAgentBody }>("/api/agents", async (request, reply) => {
  const parsed = parseCreateAgentBody(request.body);

  const agent: AgentProfile = {
    id: randomUUID(),
    name: parsed.name,
    rolePrompt: parsed.rolePrompt,
    tools: parsed.tools,
    skills: parsed.skills,
    createdAt: new Date().toISOString(),
  };

  agents.unshift(agent);
  reply.code(201);
  return { item: agent };
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
  const rolePrompt =
    typeof body.rolePrompt === "string" ? body.rolePrompt.trim() : "";

  if (!name) {
    throw badRequest("name is required");
  }

  if (!rolePrompt) {
    throw badRequest("rolePrompt is required");
  }

  return {
    name,
    rolePrompt,
    tools: normalizeStringArray(body.tools),
    skills: normalizeStringArray(body.skills),
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}
