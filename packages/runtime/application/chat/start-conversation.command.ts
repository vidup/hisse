import type { AgentsRepository } from "../../domain/ports/agents.repository.js";
import type { SkillsRepository } from "../../domain/ports/skills.repository.js";
import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentRuntime, AgentStreamEvent } from "../../domain/ports/agent-runtime.js";
import type { WorkspaceChatSettingsRepository } from "../../domain/ports/workspace-chat-settings.repository.js";
import type { Agent } from "../../domain/model/agent.js";
import { Conversation } from "../../domain/model/conversation.js";
import { parseMentions } from "../../domain/services/parse-input.js";
import { persistConversationStream } from "./persist-conversation-stream.js";
import {
  buildSkillInvocationInstruction,
  getAgentAvailableSkills,
} from "./agent-skills.js";

export class StartConversationCommand {
  constructor(
    public readonly content: string,
    public readonly launchAgentId?: string,
  ) {}
}

export class StartConversationCommandHandler {
  constructor(
    private readonly conversationsRepo: ConversationsRepository,
    private readonly agentsRepo: AgentsRepository,
    private readonly skillsRepo: SkillsRepository,
    private readonly agentRuntime: AgentRuntime,
    private readonly workspaceChatSettingsRepo: WorkspaceChatSettingsRepository,
  ) {}

  private async resolveAgent(command: StartConversationCommand): Promise<Agent> {
    const mentions = parseMentions(command.content);

    if (mentions.length > 1) {
      throw new Error("Multiple agent mentions are not supported yet.");
    }

    if (mentions.length === 1) {
      const agentName = mentions[0];
      const agents = await this.agentsRepo.finAllByWorkspaceId("default");
      const agent = agents.find((candidate) => candidate.name.toLowerCase() === agentName.toLowerCase());
      if (!agent) {
        throw new Error(`Agent "${agentName}" not found.`);
      }
      return agent;
    }

    if (command.launchAgentId) {
      return this.agentsRepo.findById(command.launchAgentId);
    }

    const settings = await this.workspaceChatSettingsRepo.get("default");
    if (settings.defaultChatAgentId) {
      try {
        return await this.agentsRepo.findById(settings.defaultChatAgentId);
      } catch {
        throw new Error("The workspace default chat agent is configured but no longer exists.");
      }
    }

    throw new Error("No agent selected. Choose a launch agent or configure a workspace default.");
  }

  async execute(command: StartConversationCommand): Promise<{
    conversationId: string;
    stream: AsyncIterable<AgentStreamEvent>;
    agentId: string;
  }> {
    const agent = await this.resolveAgent(command);

    const title = command.content.replace(/@\w[\w-]*/g, "").trim().slice(0, 60) || `Chat with ${agent.name}`;
    const conversation = Conversation.create({ title, agentId: agent.id });
    conversation.addUserTurn(command.content);
    await this.conversationsRepo.save(conversation);

    const availableSkills = await getAgentAvailableSkills(agent, this.skillsRepo);
    const skillInstruction = buildSkillInvocationInstruction(command.content, availableSkills);
    const promptContent = skillInstruction ? `${command.content}\n\n[Skill instructions]\n${skillInstruction}` : command.content;

    const session = await this.agentRuntime.createSession({
      sessionId: conversation.id,
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      availableSkills,
    });

    const source = session.prompt(promptContent);
    const stream = persistConversationStream({
      conversation,
      source,
      conversationsRepo: this.conversationsRepo,
    });

    return { conversationId: conversation.id, stream, agentId: agent.id };
  }
}
