import { maskConnector, type Connector } from "../domain/model/connector.js";
import type { ConnectorsRepository } from "../domain/ports/connectors.repository.js";

export class GetConnectorByProviderQuery {
  constructor(public readonly provider: string) {}
}

export class GetConnectorByProviderQueryHandler {
  constructor(private readonly repository: ConnectorsRepository) {}

  async execute(query: GetConnectorByProviderQuery): Promise<Connector | null> {
    const connector = await this.repository.findByProvider(query.provider);
    if (!connector) return null;
    return maskConnector(connector);
  }
}
