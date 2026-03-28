import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import type { SkillsRepository } from "../../domain/ports/skills.repository.js";
import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentRuntime, AgentStreamEvent } from "../../domain/ports/agent-runtime.js";
import { Conversation } from "../../domain/model/conversation.js";
import { parseMentions, parseSkillInvocations } from "../../domain/services/parse-input.js";
import { persistConversationStream } from "./persist-conversation-stream.js";

export class StartConversationCommand {
  constructor(public readonly content: string) {}
}

export class StartConversationCommandHandler {
  constructor(
    private readonly conversationsRepo: ConversationsRepository,
    private readonly agentsRepo: AgentsRepository,
    private readonly skillsRepo: SkillsRepository,
    private readonly agentRuntime: AgentRuntime,
  ) {}

  async execute(command: StartConversationCommand): Promise<{
    conversationId: string;
    stream: AsyncIterable<AgentStreamEvent>;
    agentId: string;
  }> {
    const mentions = parseMentions(command.content);
    if (mentions.length === 0) {
      throw new Error("First message must @mention an agent. Example: @Coder help me with this feature");
    }

    const agentName = mentions[0];
    const agents = await this.agentsRepo.finAllByWorkspaceId("default");
    const agent = agents.find((a) => a.name.toLowerCase() === agentName.toLowerCase());
    if (!agent) {
      throw new Error(`Agent "${agentName}" not found.`);
    }

    const title = command.content.replace(/@\w[\w-]*/g, "").trim().slice(0, 60) || `Chat with ${agent.name}`;
    const conversation = Conversation.create({ title, agentId: agent.id });
    conversation.addUserTurn(command.content);
    await this.conversationsRepo.save(conversation);

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

    const systemPrompt = skillContext ? `${agent.systemPrompt}${skillContext}` : agent.systemPrompt;

    const session = await this.agentRuntime.createSession({
      sessionId: conversation.id,
      systemPrompt,
      provider: agent.provider,
      model: agent.model,
    });

    const source = session.prompt(command.content);
    const stream = persistConversationStream({
      conversation,
      source,
      conversationsRepo: this.conversationsRepo,
    });

    return { conversationId: conversation.id, stream, agentId: agent.id };
  }
}
