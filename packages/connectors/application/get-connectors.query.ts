import { maskConnector, type Connector } from "../domain/model/connector.js";
import type { ConnectorsRepository } from "../domain/ports/connectors.repository.js";

export class GetConnectorsQuery {}

export class GetConnectorsQueryHandler {
  constructor(private readonly repository: ConnectorsRepository) {}

  async execute(_query: GetConnectorsQuery): Promise<Connector[]> {
    const connectors = await this.repository.findAll();
    return connectors.map(maskConnector);
  }
}
