import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentStreamEvent } from "../../domain/ports/agent-runtime.js";
import { Conversation } from "../../domain/model/conversation.js";

export async function* persistConversationStream(params: {
  conversation: Conversation;
  source: AsyncIterable<AgentStreamEvent>;
  conversationsRepo: ConversationsRepository;
}): AsyncIterable<AgentStreamEvent> {
  let assistantContent = "";
  let finalized = false;

  for await (const event of params.source) {
    if (event.type === "text_delta") {
      assistantContent += event.content;
      yield event;
      continue;
    }

    if (event.type === "error") {
      params.conversation.addFailedAssistantMessage(assistantContent, event.error);
      await params.conversationsRepo.save(params.conversation);
      finalized = true;
      yield event;
      continue;
    }

    if (event.type === "done") {
      const finalContent = assistantContent || event.fullContent;
      params.conversation.addCompletedAssistantMessage(finalContent);
      await params.conversationsRepo.save(params.conversation);
      finalized = true;
      yield event;
    }
  }

  if (!finalized) {
    params.conversation.addFailedAssistantMessage(assistantContent, "Assistant stream ended unexpectedly.");
    await params.conversationsRepo.save(params.conversation);
  }
}
