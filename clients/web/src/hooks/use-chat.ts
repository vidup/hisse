import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AgentMessageSummary } from "@/lib/api";

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

export function useSendMessage() {
  const qc = useQueryClient();
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(
    async (params: { conversationId?: string; content: string }) => {
      setIsStreaming(true);
      setStreamingContent("");

      // Optimistically add user message to the cache
      if (params.conversationId) {
        qc.setQueryData<any>(["conversations", params.conversationId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [
              ...(old.messages ?? []),
              { role: "user", content: params.content, timestamp: new Date().toISOString() },
            ],
          };
        });
      }

      try {
        const response = params.conversationId
          ? await api.chat.sendMessage(params.conversationId, params.content)
          : await api.chat.start(params.content);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let conversationId = params.conversationId;
        let agentId: string | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7);
              // Next line should be data
              continue;
            }
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.conversationId && !conversationId) {
                conversationId = data.conversationId;
              }
              if (data.agentId) {
                agentId = data.agentId;
              }
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
            }
          }
        }

        // Streaming complete — invalidate queries
        setStreamingContent("");
        setIsStreaming(false);

        if (conversationId) {
          qc.invalidateQueries({ queryKey: ["conversations", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        }

        return { conversationId, agentId, fullContent };
      } catch (error) {
        setIsStreaming(false);
        setStreamingContent("");
        throw error;
      }
    },
    [qc],
  );

  return { send, streamingContent, isStreaming };
}
