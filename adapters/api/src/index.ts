import path from "node:path";
import cors from "@fastify/cors";
import Fastify from "fastify";

// Infrastructure (JSONL repos)
import {
  JsonlSkillsRepository,
  JsonlAgentsRepository,
  JsonlStepsRepository,
  JsonlTeamsRepository,
} from "@hisse/runtime";

// Application - Handlers
import {
  // Knowledge
  CreateSkillCommandHandler,
  GetSkillsQueryHandler,
  GetSkillByIdQueryHandler,
  UpdateSkillCommandHandler,
  // Crew
  CreateAgentCommandHandler,
  GetAgentsQueryHandler,
  GetAgentConfigurationQueryHandler,
  // Steps Library
  AddStepToLibraryCommandHandler,
  GetStepsLibraryQueryHandler,
  // Teams
  CreateTeamCommandHandler,
  GetTeamsListQueryHandler,
  GetTeamWorkflowQueryHandler,
  UpdateTeamWorkflowCommandHandler,
} from "@hisse/runtime";

// Health
import {
  HealthCheckQuery,
  HealthCheckQueryHandler,
  type HealthPort,
} from "@hisse/runtime";

// Routes
import { registerSkillsRoutes } from "./routes/skills.routes.js";
import { registerAgentsRoutes } from "./routes/agents.routes.js";
import { registerLibraryRoutes } from "./routes/library.routes.js";
import { registerTeamsRoutes } from "./routes/teams.routes.js";

// --- Fastify app ---

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// --- Repositories ---

const skillsRepo = new JsonlSkillsRepository(
  path.resolve(process.cwd(), ".hisse/data/skills.jsonl"),
);
const agentsRepo = new JsonlAgentsRepository(
  path.resolve(process.cwd(), ".hisse/data/agents.jsonl"),
);
const stepsRepo = new JsonlStepsRepository(
  path.resolve(process.cwd(), ".hisse/data/steps.jsonl"),
);
const teamsRepo = new JsonlTeamsRepository(
  path.resolve(process.cwd(), ".hisse/data/teams.jsonl"),
);

// Skills repo has a sync findByIds that needs the cache pre-loaded
await skillsRepo.preload();

// --- Handlers ---

// Health
const healthAdapter: HealthPort = {
  async check() {
    return { status: "ok" };
  },
};
const healthCheck = new HealthCheckQueryHandler(healthAdapter);

// Knowledge (Skills)
const getSkills = new GetSkillsQueryHandler(skillsRepo);
const getSkillById = new GetSkillByIdQueryHandler(skillsRepo);
const createSkill = new CreateSkillCommandHandler(skillsRepo);
const updateSkill = new UpdateSkillCommandHandler(skillsRepo);

// Crew (Agents)
const getAgents = new GetAgentsQueryHandler(agentsRepo, skillsRepo);
const getAgentConfiguration = new GetAgentConfigurationQueryHandler(agentsRepo, skillsRepo);
const createAgent = new CreateAgentCommandHandler(agentsRepo);

// Steps Library
const getStepsLibrary = new GetStepsLibraryQueryHandler(stepsRepo);
const addStepToLibrary = new AddStepToLibraryCommandHandler(stepsRepo);

// Teams
const getTeamsList = new GetTeamsListQueryHandler(teamsRepo);
const getTeamWorkflow = new GetTeamWorkflowQueryHandler(teamsRepo);
const createTeam = new CreateTeamCommandHandler(teamsRepo);
const updateTeamWorkflow = new UpdateTeamWorkflowCommandHandler(teamsRepo, stepsRepo);

// --- Routes ---

app.get("/api/health", async () => {
  const result = await healthCheck.execute(new HealthCheckQuery());
  return {
    ...result,
    service: "hisse-api",
    timestamp: new Date().toISOString(),
  };
});

registerSkillsRoutes(app, { getSkills, getSkillById, createSkill, updateSkill });
registerAgentsRoutes(app, { getAgents, getAgentConfiguration, createAgent });
registerLibraryRoutes(app, { getStepsLibrary, addStepToLibrary });
registerTeamsRoutes(app, { getTeamsList, getTeamWorkflow, createTeam, updateTeamWorkflow });

// --- Start ---

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
