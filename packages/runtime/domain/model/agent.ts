import { SkillId } from "./skill";
import { ToolId } from "./tools";

export type AgentId = string;
export class Agent {
    constructor(
        public readonly id: AgentId,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly systemPrompt: string,
        public readonly provider: string,
        public readonly model: string,
        public readonly tools: Array<ToolId> = [],
        public readonly skills: Array<SkillId> = [],
    ) { }
}