import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { MessageSquareIcon } from "lucide-react";
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
  const { send, streamingContent, isStreaming } = useSendMessage();

  const agentName = conversation?.agentId
    ? agents?.find((a) => a.id === conversation.agentId)?.name
    : undefined;

  const handleSend = useCallback(
    async (content: string) => {
      const result = await send({ conversationId, content });
      if (result?.conversationId && !conversationId) {
        navigate(`/chat/${result.conversationId}`);
      }
    },
    [conversationId, send, navigate],
  );


  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-64 shrink-0">
        <ChatConversationList
          activeId={conversationId}
          onNewChat={() => navigate("/chat")}
        />
      </div>

      {/* Message area */}
      <div className="relative flex flex-1 flex-col" style={{ height: "100vh" }}>
        {/* Header — fixed top */}
        <div className="shrink-0 flex items-center gap-2 border-b px-4 py-3">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {conversation?.title || "New conversation"}
          </span>
          {agentName && (
            <span className="text-xs text-muted-foreground">with {agentName}</span>
          )}
        </div>

        {/* Messages — scrollable middle */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {!conversationId && !isStreaming && (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
                <MessageSquareIcon className="size-8" />
                <p className="text-sm">Start a new conversation</p>
                <p className="text-xs">@mention an agent to begin</p>
              </div>
            )}

            {conversation?.messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                agentName={msg.role === "assistant" ? agentName : undefined}
              />
            ))}

            {isStreaming && streamingContent && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                agentName={agentName}
                isStreaming
              />
            )}

          </div>
        </div>

        {/* Input — fixed bottom */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={
            conversationId ? "Type a message..." : "@agent start a conversation..."
          }
        />
      </div>
    </div>
  );
}
