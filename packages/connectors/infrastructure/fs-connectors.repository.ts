import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Connector } from "../domain/model/connector.js";
import type { ConnectorsRepository } from "../domain/ports/connectors.repository.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class FsConnectorsRepository implements ConnectorsRepository {
  constructor(private readonly basePath: string) {}

  async save(connector: Connector): Promise<void> {
    const slug = slugify(connector.provider);
    const dir = path.join(this.basePath, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "connector.json"),
      JSON.stringify(connector, null, 2) + "\n",
      "utf-8",
    );
  }

  async findByProvider(provider: string): Promise<Connector | null> {
    const slug = slugify(provider);
    const filePath = path.join(this.basePath, slug, "connector.json");
    try {
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw) as Connector;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Connector[]> {
    const connectors: Connector[] = [];

    let entries: string[];
    try {
      const dirents = await readdir(this.basePath, { withFileTypes: true });
      entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    } catch {
      return [];
    }

    for (const entry of entries) {
      try {
        const raw = await readFile(
          path.join(this.basePath, entry, "connector.json"),
          "utf-8",
        );
        connectors.push(JSON.parse(raw) as Connector);
      } catch {
        // Skip malformed connector directories
      }
    }

    return connectors;
  }

  async remove(provider: string): Promise<void> {
    const slug = slugify(provider);
    const dir = path.join(this.basePath, slug);
    try {
      await rm(dir, { recursive: true });
    } catch {
      // Already gone
    }
  }
}
