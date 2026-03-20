export class AgentDefinition {
    constructor(
        public data: {
            id: string;
            name: string;
            description?: string;
            systemPrompt: string;
            model: string;
            provider: "anthropic" | "openai" | "google" | "custom";
        }
    ) { }

    static create(data: {
        name: string;
        description?: string;
        systemPrompt: string;
        model: string;
        provider: "anthropic" | "openai" | "google" | "custom";
    }) {
        return new AgentDefinition({
            id: crypto.randomUUID(),
            ...data,
        });
    }
}