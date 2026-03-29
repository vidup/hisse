import cors from "@fastify/cors";
import Fastify from "fastify";
import { HealthCheckQuery, HealthCheckQueryHandler, type HealthPort } from "@hisse/runtime";
import { registerAgentsRoutes } from "./routes/agents.routes.js";
import { registerChatRoutes } from "./routes/chat.routes.js";
import { registerConnectorsRoutes } from "./routes/connectors.routes.js";
import { registerProjectsRoutes } from "./routes/projects.routes.js";
import { registerSkillsRoutes } from "./routes/skills.routes.js";
import { registerToolsRoutes } from "./routes/tools.routes.js";
import { registerWorkspaceImportRoutes } from "./routes/workspace-import.routes.js";
import { registerWorkspaceSettingsRoutes } from "./routes/workspace-settings.routes.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

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

registerSkillsRoutes(app);
registerAgentsRoutes(app);
registerProjectsRoutes(app);
registerToolsRoutes(app);
registerConnectorsRoutes(app);
registerChatRoutes(app);
registerWorkspaceImportRoutes(app);
registerWorkspaceSettingsRoutes(app);

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
