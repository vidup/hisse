import cors from "@fastify/cors";
import Fastify from "fastify";

import {
  HealthCheckQuery,
  HealthCheckQueryHandler,
  type HealthPort,
} from "@hisse/runtime";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Driven adapter — inline for now, will move to infrastructure later
const healthAdapter: HealthPort = {
  async check() {
    return { status: "ok" };
  },
};

const healthCheck = new HealthCheckQueryHandler(healthAdapter);

app.get("/api/health", async () => {
  const result = await healthCheck.execute(new HealthCheckQuery());
  return {
    ...result,
    service: "hisse-api",
    timestamp: new Date().toISOString(),
  };
});

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
