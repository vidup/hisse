import type { Agent } from "../../domain/model/agent.js";

export type ExecutionSurface = "chat" | "workflow_step";

export interface ComposeSystemPromptParams {
  surface: ExecutionSurface;
  agent: Pick<Agent, "name" | "description" | "systemPrompt">;
  runtimeContext?: string;
}

function buildSurfaceInstructions(surface: ExecutionSurface): string {
  switch (surface) {
    case "workflow_step":
      return [
        "You are executing a workflow step inside Hisse.",
        "Your primary goal is task completion.",
        "Ask for human input only when it is truly necessary to unblock the step.",
      ].join("\n");
    case "chat":
    default:
      return [
        "You are collaborating with a human inside a chat interface.",
        "Keep visible messages concise, clear, and useful.",
        "Prefer taking action with tools over long speculative explanations.",
      ].join("\n");
  }
}

export function composeSystemPrompt(params: ComposeSystemPromptParams): string {
  const agentDescription = params.agent.description.trim();
  const agentPrompt = params.agent.systemPrompt.trim();
  const runtimeContext = params.runtimeContext?.trim();

  const sections = [
    [
      "<role>",
      "You are an AI agent running inside Hisse, a workspace-based agent platform.",
      "</role>",
    ].join("\n"),
    [
      "<platform>",
      "Users can see your messages, tool activity, latest plan, working files, and context in the app.",
      "Use tools when needed, and keep the visible conversation readable.",
      "Skills are protected workspace resources. Use ListAgentSkills, ReadAgentSkill, and ReadAgentSkillFile to work with them.",
      "Do not try to inspect .hisse/skills with generic filesystem tools.",
      "When you need structured human input, use AskUserQuestions instead of asking for ad-hoc prose.",
      "AskUserQuestions supports yes_no, single_select, and multi_select questions, with a maximum of 6 questions per bundle.",
      "Each rendered question already includes a free-text response field automatically, so do not add your own extra fallback field.",
      "After calling AskUserQuestions, stop and wait for the user's reply unless one short framing sentence is genuinely useful.",
      "When the user replies through that UI, you will receive a mechanical summary message containing the structured answers.",
      "</platform>",
    ].join("\n"),
    [
      `<surface name="${params.surface}">`,
      buildSurfaceInstructions(params.surface),
      "</surface>",
    ].join("\n"),
    [
      "<planning>",
      "Use UpdatePlan for non-trivial work that spans multiple steps, file changes, or uncertainty.",
      "Keep plans short and update them when the work changes materially.",
      "</planning>",
    ].join("\n"),
    [
      "<agent>",
      `Name: ${params.agent.name}`,
      agentDescription.length > 0 ? `Description: ${agentDescription}` : undefined,
      agentPrompt.length > 0 ? "Instructions:" : undefined,
      agentPrompt.length > 0 ? agentPrompt : undefined,
      "</agent>",
    ].filter((line): line is string => Boolean(line)).join("\n"),
    runtimeContext
      ? [
        "<runtime_context>",
        runtimeContext,
        "</runtime_context>",
      ].join("\n")
      : undefined,
  ];

  return sections.filter((section): section is string => Boolean(section)).join("\n\n");
}
