import cors from "@fastify/cors";
import Fastify from "fastify";
import { HealthCheckQuery, HealthCheckQueryHandler, type HealthPort } from "@hisse/runtime";
import { registerSkillsRoutes } from "./routes/skills.routes.js";
import { registerAgentsRoutes } from "./routes/agents.routes.js";
import { registerLibraryRoutes } from "./routes/library.routes.js";
import { registerTeamsRoutes } from "./routes/teams.routes.js";
import { registerWorkflowsRoutes } from "./routes/workflows.routes.js";
import { registerProjectsRoutes } from "./routes/projects.routes.js";
import { registerToolsRoutes } from "./routes/tools.routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Health check (no workspace needed)
const healthAdapter: HealthPort = {
  async check() {
    return { status: "ok" };
  },
};
const healthCheck = new HealthCheckQueryHandler(healthAdapter);

app.get("/api/health", async () => ({
  ...await healthCheck.execute(new HealthCheckQuery()),
  service: "hisse-api",
  timestamp: new Date().toISOString(),
}));

// Register routes (they handle workspace resolution internally)
registerSkillsRoutes(app);
registerAgentsRoutes(app);
registerLibraryRoutes(app);
registerTeamsRoutes(app);
registerWorkflowsRoutes(app);
registerProjectsRoutes(app);
registerToolsRoutes(app);

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
