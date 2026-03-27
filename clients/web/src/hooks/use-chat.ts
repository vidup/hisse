import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ChatStreamEvent, type ConversationDetail } from "@/lib/api";

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
  onConversationCreated?: (conversationId: string) => void;
}

interface SendMessageResult {
  conversationId?: string;
  agentId?: string;
  fullContent: string;
  error?: string;
}

export type ChatStreamPhase = "idle" | "starting" | "thinking" | "streaming";

export function useSendMessage() {
  const qc = useQueryClient();
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamPhase, setStreamPhase] = useState<ChatStreamPhase>("idle");
  const [streamAgentId, setStreamAgentId] = useState<string | undefined>();

  const send = useCallback(
    async (params: SendMessageParams): Promise<SendMessageResult | null> => {
      setIsStreaming(true);
      setStreamingContent("");
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
          return {
            ...old,
            messages: [
              ...old.messages,
              { role: "user", content: params.content, timestamp: new Date().toISOString() },
            ],
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
          await api.chat.sendMessage(params.conversationId, params.content, { onEvent: handleEvent });
        } else {
          await api.chat.start(params.content, { onEvent: handleEvent });
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
        setStreamPhase("idle");
        setStreamAgentId(undefined);
      }
    },
    [qc],
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return { send, streamingContent, isStreaming, errorMessage, clearError, streamPhase, streamAgentId };
}
