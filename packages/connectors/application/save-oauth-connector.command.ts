import type { OAuthConnector } from "../domain/model/connector.js";
import type { ConnectorsRepository } from "../domain/ports/connectors.repository.js";

export class SaveOAuthConnectorCommand {
  constructor(
    public readonly provider: string,
    public readonly accessToken: string,
    public readonly refreshToken?: string,
    public readonly expiresAt?: string,
  ) {}
}

export class SaveOAuthConnectorCommandHandler {
  constructor(private readonly repository: ConnectorsRepository) {}

  async execute(command: SaveOAuthConnectorCommand): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.repository.findByProvider(command.provider);

    const connector: OAuthConnector = {
      provider: command.provider,
      method: "oauth",
      accessToken: command.accessToken,
      refreshToken: command.refreshToken,
      expiresAt: command.expiresAt,
      status: "connected",
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now,
    };

    await this.repository.save(connector);
  }
}
