import path from "node:path";
import { describe, expect, it, afterAll } from "vitest";

const folderPath = path.join(process.cwd(), "tests", "data", "agents");
const filePath = path.join(folderPath, "agents.jsonl");

import { JsonlAgentRepository } from "./agent-repository.jsonl";
import { AgentDefinition } from "../domain/model/agent-definition";
import { unlink } from "node:fs/promises";

describe("JsonlAgentRepository", () => {
    it("should save an agent", async () => {
        const repository = new JsonlAgentRepository(filePath);
        await repository.save(AgentDefinition.create({ name: "test", systemPrompt: "test", model: "gpt-4o", provider: "openai" }));

        const agents = await repository.findAll();
        expect(agents).toHaveLength(1);
        expect(agents[0].data.name).toBe("test");
        expect(agents[0].data.systemPrompt).toBe("test");
        expect(agents[0].data.model).toBe("gpt-4o");
        expect(agents[0].data.provider).toBe("openai");
    });

    afterAll(async () => {
        await unlink(filePath);
    });
});