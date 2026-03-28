import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { MessageSquareIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConversation, useSendMessage } from "@/hooks/use-chat";
import { useAgents } from "@/hooks/use-agents";
import { ChatConversationList } from "./chat-conversation-list";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { data: conversation } = useConversation(conversationId);
  const { data: agents } = useAgents();
  const { send, streamingContent, streamingActivities, isStreaming, errorMessage, streamPhase, streamAgentId } =
    useSendMessage();

  const agentName = conversation?.agentId
    ? agents?.find((a) => a.id === conversation.agentId)?.name
    : undefined;
  const streamingAgentName = streamAgentId
    ? agents?.find((a) => a.id === streamAgentId)?.name
    : agentName;
  const loadingLabel =
    streamPhase === "starting"
      ? "Starting the conversation..."
      : streamPhase === "thinking"
        ? "Analyzing the request and preparing a response..."
        : streamPhase === "acting"
          ? "Using workspace tools..."
        : undefined;

  const handleSend = useCallback(
    async (content: string) => {
      await send({
        conversationId,
        content,
        onConversationCreated: (createdConversationId) => {
          navigate(`/chat/${createdConversationId}`);
        },
      });
    },
    [conversationId, navigate, send],
  );

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0">
        <ChatConversationList activeId={conversationId} onNewChat={() => navigate("/chat")} />
      </div>

      <div className="relative flex flex-1 flex-col" style={{ height: "100vh" }}>
        <div className="shrink-0 flex items-center gap-2 border-b px-4 py-3">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{conversation?.title || "New conversation"}</span>
          {agentName && <span className="text-xs text-muted-foreground">with {agentName}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {!conversationId && !isStreaming && (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
                <MessageSquareIcon className="size-8" />
                <p className="text-sm">Start a new conversation</p>
                <p className="text-xs">@mention an agent to begin</p>
              </div>
            )}

            {conversation?.entries.map((entry, i) => (
              <ChatMessage
                key={i}
                role={entry.kind === "user_turn" ? "user" : "assistant"}
                content={entry.text}
                activities={entry.activities}
                agentName={entry.kind === "assistant_turn" ? agentName : undefined}
              />
            ))}

            {isStreaming && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                activities={streamingActivities}
                agentName={streamingAgentName}
                isStreaming
                loadingLabel={loadingLabel}
              />
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="shrink-0 px-4 pb-2">
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={conversationId ? "Type a message..." : "@agent start a conversation..."}
        />
      </div>
    </div>
  );
}
