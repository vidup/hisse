import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AgentMessageActivitySummary,
  type ChatStreamEvent,
  type ConversationArtifactSummary,
  type ConversationDetail,
  type ConversationPlanSummary,
  type HitlResponseInput,
} from "@/lib/api";

export function useConversations() {
  return useQuery({ queryKey: ["conversations"], queryFn: api.chat.list });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: ["conversations", id],
    queryFn: () => api.chat.getById(id!),
    enabled: !!id,
  });
}

interface SendMessageParams {
  conversationId?: string;
  content: string;
  launchAgentId?: string;
  onConversationCreated?: (conversationId: string) => void;
  hitlResponse?: HitlResponseInput;
}

interface SendMessageResult {
  conversationId?: string;
  agentId?: string;
  fullContent: string;
  error?: string;
}

function upsertActivity(
  activities: AgentMessageActivitySummary[],
  nextActivity: AgentMessageActivitySummary,
): AgentMessageActivitySummary[] {
  const nextActivities = [...activities];
  const index = nextActivities.findIndex((activity) => activity.id === nextActivity.id);

  if (index === -1) {
    nextActivities.push(nextActivity);
  } else {
    nextActivities[index] = nextActivity;
  }

  return nextActivities;
}

export type ChatStreamPhase = "idle" | "starting" | "thinking" | "acting" | "streaming";

export function useSendMessage() {
  const qc = useQueryClient();
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingActivities, setStreamingActivities] = useState<AgentMessageActivitySummary[]>([]);
  const [streamingArtifacts, setStreamingArtifacts] = useState<ConversationArtifactSummary[]>([]);
  const [streamingPlan, setStreamingPlan] = useState<ConversationPlanSummary | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamPhase, setStreamPhase] = useState<ChatStreamPhase>("idle");
  const [streamAgentId, setStreamAgentId] = useState<string | undefined>();

  const send = useCallback(
    async (params: SendMessageParams): Promise<SendMessageResult | null> => {
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingActivities([]);
      setStreamingArtifacts([]);
      setStreamingPlan(undefined);
      setErrorMessage(null);
      setStreamPhase("starting");
      setStreamAgentId(undefined);

      const conversationQueryKey = params.conversationId
        ? (["conversations", params.conversationId] as const)
        : null;
      const previousConversation = conversationQueryKey
        ? qc.getQueryData<ConversationDetail>(conversationQueryKey)
        : undefined;

      if (conversationQueryKey) {
        qc.setQueryData<ConversationDetail | undefined>(conversationQueryKey, (old) => {
          if (!old) return old;
          const updatedEntries = params.hitlResponse
            ? old.entries.map((entry) =>
                entry.kind !== "assistant_turn"
                  ? entry
                  : {
                      ...entry,
                      artifacts: entry.artifacts.map((artifact) =>
                        artifact.id !== params.hitlResponse?.artifactId
                          ? artifact
                          : {
                              ...artifact,
                              status: "answered" as const,
                              answers: params.hitlResponse.answers.map((answer) => ({
                                questionId: answer.questionId,
                                selectedOptionIds: answer.selectedOptionIds ?? [],
                                numericValue: answer.numericValue,
                                comment: answer.comment ?? "",
                              })),
                              answeredAt: new Date().toISOString(),
                            },
                      ),
                    },
              )
            : old.entries;

          return {
            ...old,
            entries:
              params.content.trim().length > 0
                ? [
                    ...updatedEntries,
                    {
                      kind: "user_turn",
                      text: params.content,
                      timestamp: new Date().toISOString(),
                      activities: [],
                      artifacts: [],
                    },
                  ]
                : updatedEntries,
          };
        });
      }

      let conversationId = params.conversationId;
      let agentId: string | undefined;
      let fullContent = "";
      let streamError: string | undefined;
      let didNotifyConversationCreated = false;

      const handleEvent = (event: ChatStreamEvent) => {
        switch (event.type) {
          case "meta":
            conversationId = event.conversationId;
            agentId = event.agentId;
            setStreamAgentId(event.agentId);
            setStreamPhase("thinking");
            if (!params.conversationId && !didNotifyConversationCreated) {
              didNotifyConversationCreated = true;
              params.onConversationCreated?.(event.conversationId);
            }
            void qc.invalidateQueries({ queryKey: ["conversations"] });
            return;

          case "delta":
            fullContent += event.content;
            setStreamPhase("streaming");
            setStreamingContent(fullContent);
            return;

          case "activity_start":
          case "activity_update":
          case "activity_end":
            setStreamPhase((current) => (current === "streaming" ? current : "acting"));
            setStreamingActivities((current) => upsertActivity(current, event.activity));
            return;

          case "plan_update":
            setStreamPhase((current) => (current === "streaming" ? current : "acting"));
            setStreamingPlan(event.plan);
            return;

          case "artifact_update":
            setStreamPhase((current) => (current === "streaming" ? current : "acting"));
            setStreamingArtifacts((current) => {
              const nextArtifacts = [...current];
              const index = nextArtifacts.findIndex((artifact) => artifact.id === event.artifact.id);

              if (index === -1) {
                nextArtifacts.push(event.artifact);
              } else {
                nextArtifacts[index] = event.artifact;
              }

              return nextArtifacts;
            });
            return;

          case "done":
            conversationId = event.conversationId;
            agentId = event.agentId;
            setStreamAgentId(event.agentId);
            if (!fullContent && event.fullContent) {
              fullContent = event.fullContent;
              setStreamPhase("streaming");
              setStreamingContent(fullContent);
            }
            return;

          case "error":
            conversationId = event.conversationId;
            agentId = event.agentId;
            setStreamAgentId(event.agentId);
            streamError = event.error;
            return;
        }
      };

      try {
        if (params.conversationId) {
          await api.chat.sendMessage(
            params.conversationId,
            { content: params.content, hitlResponse: params.hitlResponse },
            { onEvent: handleEvent },
          );
        } else {
          await api.chat.start(
            { content: params.content, launchAgentId: params.launchAgentId },
            { onEvent: handleEvent },
          );
        }

        if (conversationId) {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["conversations"] }),
            qc.invalidateQueries({ queryKey: ["conversations", conversationId] }),
          ]);
        } else {
          await qc.invalidateQueries({ queryKey: ["conversations"] });
        }

        if (streamError) {
          setErrorMessage(streamError);
        }

        return {
          conversationId,
          agentId,
          fullContent,
          error: streamError,
        };
      } catch (error) {
        if (conversationQueryKey) {
          qc.setQueryData(conversationQueryKey, previousConversation);
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        setErrorMessage(message);
        return null;
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        setStreamingActivities([]);
        setStreamingArtifacts([]);
        setStreamingPlan(undefined);
        setStreamPhase("idle");
        setStreamAgentId(undefined);
      }
    },
    [qc],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    send,
    streamingContent,
    streamingActivities,
    streamingArtifacts,
    streamingPlan,
    isStreaming,
    errorMessage,
    clearError,
    streamPhase,
    streamAgentId,
  };
}
