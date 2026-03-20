import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parseEventLine, stringifyEvent, type HisseEvent } from "../core/events";

export class JsonlEventStore {
	private readonly eventsPath: string;

	constructor(baseDir: string, projectId: string) {
		this.eventsPath = join(baseDir, ".hisse", projectId, "events.jsonl");
	}

	async append(event: HisseEvent): Promise<void> {
		await mkdir(dirname(this.eventsPath), { recursive: true });
		await appendFile(this.eventsPath, `${stringifyEvent(event)}\n`, "utf8");
	}

	async loadAll(): Promise<HisseEvent[]> {
		try {
			const content = await readFile(this.eventsPath, "utf8");
			if (!content.trim()) return [];
			return content
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.map((line) => parseEventLine(line));
		} catch (error) {
			if (isMissingFileError(error)) return [];
			throw error;
		}
	}
}

function isMissingFileError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof (error as { code: unknown }).code === "string" &&
		(error as { code: string }).code === "ENOENT"
	);
}
