const MENTION_REGEX = /(?:^|\s)@(\w[\w-]*)/g;
const SKILL_REGEX = /(?:^|\s)\/(\w[\w-]*)/g;

export function parseMentions(text: string): string[] {
  return [...text.matchAll(MENTION_REGEX)].map((m) => m[1]);
}

export function parseSkillInvocations(text: string): string[] {
  return [...text.matchAll(SKILL_REGEX)].map((m) => m[1]);
}
