import { AgentId } from "./agent";

export type StepId = string;

export class HumanStep {
    constructor(
        public readonly id: StepId,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly transports: Array<Transport> = [],
    ) { }
}

interface Transport {
    type: string;
    target: string;
    configuration: Record<string, any>;
    authenticated: boolean;
}


export class AgentStep {
    constructor(
        public readonly id: StepId,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly agentId: AgentId,
    ) { }
}

export type Step = HumanStep | AgentStep;
