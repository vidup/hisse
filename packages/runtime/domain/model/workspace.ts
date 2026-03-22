import type { StepId } from "./steps";

export class Workspace {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly createdAt: Date,
        public readonly teams: Array<Team> = [],
    ) { }
}

class Team {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly createdAt: Date,
        public readonly workflow: Array<StepId> = [],
    ) { }
}