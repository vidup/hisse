import type { ConversationsRepository } from "../../domain/ports/conversations.repository.js";
import type { ConversationEntry } from "../../domain/model/message.js";

export class GetConversationQuery {
  constructor(public readonly conversationId: string) {}
}

function summarizeArtifacts(entry: ConversationEntry) {
  if (entry.kind !== "assistant_turn") {
    return [];
  }

  return entry.artifacts.map((artifact) => ({
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    instructions: artifact.instructions,
    status: artifact.status,
    questions: artifact.questions.map((question) => ({
      id: question.id,
      label: question.label,
      description: question.description,
      type: question.type,
      options:
        question.type === "yes_no"
          ? [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
            ]
          : question.type === "scale"
            ? []
            : (question.options ?? []).map((option) => ({
              id: option.id,
              label: option.label,
            })),
      range:
        question.type === "scale"
          ? {
              min: question.range!.min,
              max: question.range!.max,
              step: question.range!.step,
              unit: question.range!.unit,
              marks: (question.range!.marks ?? []).map((mark) => ({
                value: mark.value,
                label: mark.label,
              })),
            }
          : undefined,
    })),
    answers: artifact.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds,
      numericValue: answer.numericValue,
      comment: answer.comment,
    })),
    createdAt: artifact.createdAt.toISOString(),
    answeredAt: artifact.answeredAt?.toISOString(),
  }));
}

export class GetConversationQueryHandler {
  constructor(private readonly conversationsRepo: ConversationsRepository) {}

  async execute(query: GetConversationQuery) {
    const conversation = await this.conversationsRepo.findById(query.conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${query.conversationId}`);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      agentId: conversation.agentId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      entries: conversation.entries.map((entry) => ({
        kind: entry.kind,
        text: entry.text,
        status: entry.kind === "assistant_turn" ? entry.status : undefined,
        error: entry.kind === "assistant_turn" ? entry.error : undefined,
        timestamp: (entry.completedAt ?? entry.createdAt).toISOString(),
        activities: entry.kind === "assistant_turn"
          ? entry.activities.map((activity) => ({
              id: activity.id,
              kind: activity.kind,
              name: activity.name,
              label: activity.label,
              status: activity.status,
              startedAt: activity.startedAt.toISOString(),
              completedAt: activity.completedAt?.toISOString(),
            }))
          : [],
        plan: entry.kind === "assistant_turn" && entry.plan
          ? {
              steps: entry.plan.steps.map((step) => ({
                id: step.id,
                label: step.label,
                status: step.status,
              })),
              updatedAt: entry.plan.updatedAt.toISOString(),
            }
          : undefined,
        artifacts: summarizeArtifacts(entry),
      })),
    };
  }
}
