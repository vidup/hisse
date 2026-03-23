import type { ApiKeyConnector } from "../domain/model/connector.js";
import type { ConnectorsRepository } from "../domain/ports/connectors.repository.js";

export class SaveApiKeyConnectorCommand {
  constructor(
    public readonly provider: string,
    public readonly apiKey: string,
  ) {}
}

export class SaveApiKeyConnectorCommandHandler {
  constructor(private readonly repository: ConnectorsRepository) {}

  async execute(command: SaveApiKeyConnectorCommand): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.repository.findByProvider(command.provider);

    const connector: ApiKeyConnector = {
      provider: command.provider,
      method: "api_key",
      apiKey: command.apiKey,
      status: "connected",
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now,
    };

    await this.repository.save(connector);
  }
}
