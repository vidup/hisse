import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import type { SkillsRepository } from "../../domain/ports/skills.repository.js";
import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentRuntime, AgentStreamEvent } from "../../domain/ports/agent-runtime.js";
import {
  getQuestionOptions,
  type ConversationQuestionAnswerInput,
  type QuestionnaireArtifact,
} from "../../domain/model/message.js";
import { parseMentions } from "../../domain/services/parse-input.js";
import { persistConversationStream } from "./persist-conversation-stream.js";
import { composeSystemPrompt } from "../prompting/compose-system-prompt.js";
import {
  buildSkillInvocationInstruction,
  getAgentAvailableSkills,
} from "./agent-skills.js";

export class SendMessageCommand {
  constructor(
    public readonly conversationId: string,
    public readonly content: string,
    public readonly hitlResponse?: {
      artifactId: string;
      answers: ConversationQuestionAnswerInput[];
    },
  ) {}
}

function formatQuestionnaireResponse(artifact: QuestionnaireArtifact): string {
  const lines = [
    artifact.title ? `Structured response: ${artifact.title}` : "Structured response:",
  ];

  for (const question of artifact.questions) {
    const answer = artifact.answers.find((candidate) => candidate.questionId === question.id);
    const selectedLabels = (answer?.selectedOptionIds ?? [])
      .map((optionId) => getQuestionOptions(question).find((option) => option.id === optionId)?.label)
      .filter((label): label is string => !!label);

    lines.push(`- ${question.label}`);
    lines.push(
      `  Selection: ${selectedLabels.length > 0 ? selectedLabels.join(", ") : "No option selected"}`,
    );

    if ((answer?.comment ?? "").length > 0) {
      lines.push(`  Free text: ${answer?.comment}`);
    }
  }

  return lines.join("\n");
}

export class SendMessageCommandHandler {
  constructor(
    private readonly conversationsRepo: ConversationsRepository,
    private readonly agentsRepo: AgentsRepository,
    private readonly skillsRepo: SkillsRepository,
    private readonly agentRuntime: AgentRuntime,
  ) {}

  async execute(command: SendMessageCommand): Promise<{
    stream: AsyncIterable<AgentStreamEvent>;
    agentId: string;
    conversationId: string;
  }> {
    const conversation = await this.conversationsRepo.findById(command.conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${command.conversationId}`);
    }

    const agent = await this.agentsRepo.findById(conversation.agentId);

    const mentions = parseMentions(command.content);
    if (mentions.length > 0) {
      if (agent.name.toLowerCase() !== mentions[0].toLowerCase()) {
        throw new Error(
          `This conversation uses agent "${agent.name}". Start a new conversation to use a different agent.`,
        );
      }
    }

    const availableSkills = await getAgentAvailableSkills(agent, this.skillsRepo);
    const answeredArtifact = command.hitlResponse
      ? conversation.answerQuestionnaire(
          command.hitlResponse.artifactId,
          command.hitlResponse.answers,
        )
      : undefined;
    const trimmedContent = command.content.trim();
    const userMessageContent = answeredArtifact
      ? [
          formatQuestionnaireResponse(answeredArtifact),
          trimmedContent ? `Additional note:\n${trimmedContent}` : undefined,
        ]
          .filter((part): part is string => Boolean(part))
          .join("\n\n")
      : trimmedContent;

    if (!userMessageContent) {
      throw new Error("Message content cannot be empty.");
    }

    const skillInstruction = buildSkillInvocationInstruction(userMessageContent, availableSkills);

    conversation.addUserTurn(userMessageContent);
    await this.conversationsRepo.save(conversation);

    const session = await this.agentRuntime.resumeSession({
      sessionId: conversation.id,
      systemPrompt: composeSystemPrompt({
        surface: "chat",
        agent,
      }),
      availableSkills,
    });

    const promptContent = skillInstruction
      ? `${userMessageContent}\n\n[Skill instructions]\n${skillInstruction}`
      : userMessageContent;
    const source = session.prompt(promptContent);
    const stream = persistConversationStream({
      conversation,
      source,
      conversationsRepo: this.conversationsRepo,
    });

    return { stream, agentId: conversation.agentId, conversationId: conversation.id };
  }
}
