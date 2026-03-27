import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import type { SkillsRepository } from "../../domain/ports/skills.repository.js";
import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentRuntime, AgentStreamEvent } from "../../domain/ports/agent-runtime.js";
import { parseMentions, parseSkillInvocations } from "../../domain/services/parse-input.js";
import { persistConversationStream } from "./persist-conversation-stream.js";

export class SendMessageCommand {
  constructor(
    public readonly conversationId: string,
    public readonly content: string,
  ) {}
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

    const mentions = parseMentions(command.content);
    if (mentions.length > 0) {
      const agent = await this.agentsRepo.findById(conversation.agentId);
      if (agent.name.toLowerCase() !== mentions[0].toLowerCase()) {
        throw new Error(
          `This conversation uses agent "${agent.name}". Start a new conversation to use a different agent.`,
        );
      }
    }

    const skillNames = parseSkillInvocations(command.content);
    let skillContext = "";
    if (skillNames.length > 0) {
      const allSkills = await this.skillsRepo.findAllByWorkspaceId("default");
      for (const name of skillNames) {
        const skill = allSkills.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (skill) {
          skillContext += `\n\n---\n\n## Skill: ${skill.name}\n${skill.skillContent}`;
        }
      }
    }

    conversation.addUserMessage(command.content);
    await this.conversationsRepo.save(conversation);

    const session = await this.agentRuntime.resumeSession(conversation.id);

    const promptContent = skillContext ? `${command.content}\n\n${skillContext}` : command.content;
    const source = session.prompt(promptContent);
    const stream = persistConversationStream({
      conversation,
      source,
      conversationsRepo: this.conversationsRepo,
    });

    return { stream, agentId: conversation.agentId, conversationId: conversation.id };
  }
}
