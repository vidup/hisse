import type { Connector } from "../model/connector.js";

export interface ConnectorsRepository {
  save(connector: Connector): Promise<void>;
  findByProvider(provider: string): Promise<Connector | null>;
  findAll(): Promise<Connector[]>;
  remove(provider: string): Promise<void>;
}
