export class Skill {
    constructor(
        public readonly id: SkillId,
        public name: string,
        public description: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public skillContent: string, // basically SKILL.md content
    ) { }
}

export type SkillId = string;