import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { AgentStreamEvent } from "../../domain/ports/agent-runtime.js";
import { Conversation } from "../../domain/model/conversation.js";
import type { ConversationActivity, ConversationPlan } from "../../domain/model/message.js";

function finalizeActivities(
  activities: Iterable<ConversationActivity>,
  fallbackStatus?: "completed" | "failed",
): ConversationActivity[] {
  const now = new Date();

  return Array.from(activities, (activity) => {
    if (activity.status !== "running" || !fallbackStatus) {
      return activity;
    }

    return {
      ...activity,
      status: fallbackStatus,
      completedAt: activity.completedAt ?? now,
    };
  });
}

export async function* persistConversationStream(params: {
  conversation: Conversation;
  source: AsyncIterable<AgentStreamEvent>;
  conversationsRepo: ConversationsRepository;
}): AsyncIterable<AgentStreamEvent> {
  let assistantContent = "";
  let finalized = false;
  const activities = new Map<string, ConversationActivity>();
  let latestPlan: ConversationPlan | undefined;

  for await (const event of params.source) {
    if (event.type === "text_delta") {
      assistantContent += event.content;
      yield event;
      continue;
    }

    if (event.type === "activity_start" || event.type === "activity_update" || event.type === "activity_end") {
      activities.set(event.activity.id, event.activity);
      yield event;
      continue;
    }

    if (event.type === "plan_update") {
      latestPlan = event.plan;
      yield event;
      continue;
    }

    if (event.type === "error") {
      params.conversation.addFailedAssistantTurn(
        assistantContent,
        event.error,
        finalizeActivities(activities.values(), "failed"),
        latestPlan,
      );
      await params.conversationsRepo.save(params.conversation);
      finalized = true;
      yield event;
      continue;
    }

    if (event.type === "done") {
      const finalContent = assistantContent || event.fullContent;
      params.conversation.addCompletedAssistantTurn(
        finalContent,
        finalizeActivities(activities.values()),
        latestPlan,
      );
      await params.conversationsRepo.save(params.conversation);
      finalized = true;
      yield event;
    }
  }

  if (!finalized) {
    params.conversation.addFailedAssistantTurn(
      assistantContent,
      "Assistant stream ended unexpectedly.",
      finalizeActivities(activities.values(), "failed"),
      latestPlan,
    );
    await params.conversationsRepo.save(params.conversation);
  }
}
