import type { TSchema } from "typebox";

export class Tool {
    constructor(
        public readonly id: ToolId,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly inputSchema: TSchema,
        public readonly outputSchema: TSchema,
        public readonly codePath: string,
    ) { }
}

export type ToolId = string;