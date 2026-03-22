import type { HealthPort } from "../domain/ports/health.port.js";

export class HealthCheckQuery {}

export class HealthCheckQueryHandler {
  constructor(private readonly health: HealthPort) {}

  async execute(_query: HealthCheckQuery): Promise<{ status: string }> {
    return this.health.check();
  }
}
