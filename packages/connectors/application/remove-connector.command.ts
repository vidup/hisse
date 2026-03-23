import type { ConnectorsRepository } from "../domain/ports/connectors.repository.js";

export class RemoveConnectorCommand {
  constructor(public readonly provider: string) {}
}

export class RemoveConnectorCommandHandler {
  constructor(private readonly repository: ConnectorsRepository) {}

  async execute(command: RemoveConnectorCommand): Promise<void> {
    await this.repository.remove(command.provider);
  }
}
