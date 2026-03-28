import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { MessageSquareIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/hooks/use-agents";
import { useConversation, useConversations, useSendMessage } from "@/hooks/use-chat";
import { useSkills } from "@/hooks/use-skills";
import { useRightPanel } from "@/layouts/right-panel";
import {
  useUpdateWorkspaceChatSettings,
  useWorkspaceChatSettings,
} from "@/hooks/use-workspace-chat-settings";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatWorkspacePanel } from "./chat-workspace-panel";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { data: conversation } = useConversation(conversationId);
  const { data: conversations } = useConversations();
  const { data: agents } = useAgents();
  const { data: skills } = useSkills();
  const { data: workspaceChatSettings } = useWorkspaceChatSettings();
  const updateWorkspaceChatSettings = useUpdateWorkspaceChatSettings();
  const { setContent: setRightPanelContent } = useRightPanel();
  const {
    send,
    streamingContent,
    streamingActivities,
    streamingPlan,
    isStreaming,
    errorMessage,
    streamPhase,
    streamAgentId,
  } = useSendMessage();
  const [launchAgentId, setLaunchAgentId] = useState("");

  const agentName = conversation?.agentId
    ? agents?.find((agent) => agent.id === conversation.agentId)?.name
    : undefined;
  const streamingAgentName = streamAgentId
    ? agents?.find((agent) => agent.id === streamAgentId)?.name
    : agentName;
  const loadingLabel =
    streamPhase === "starting"
      ? "Starting the conversation..."
      : streamPhase === "thinking"
        ? "Analyzing the request and preparing a response..."
        : streamPhase === "acting"
          ? "Using workspace tools..."
          : undefined;
  const latestConversationAgentId = conversations?.[0]?.agentId;
  const preferredLaunchAgentId =
    latestConversationAgentId ?? workspaceChatSettings?.defaultChatAgentId ?? "";
  const launchAgentName = launchAgentId
    ? agents?.find((agent) => agent.id === launchAgentId)?.name
    : undefined;
  const hasAgents = (agents?.length ?? 0) > 0;
  const isWorkspaceDefaultLaunchAgent =
    !!launchAgentId && workspaceChatSettings?.defaultChatAgentId === launchAgentId;
  const isNewConversationView = !conversationId && !isStreaming;
  const launchAgent = launchAgentId
    ? agents?.find((agent) => agent.id === launchAgentId)
    : undefined;
  const activeSkillContextAgent = isNewConversationView
    ? launchAgent
    : conversation?.agentId
      ? agents?.find((agent) => agent.id === conversation.agentId)
      : undefined;
  const preferredSkillIds = activeSkillContextAgent?.skills.map((skill) => skill.id) ?? [];
  const preferredSkillLabel = activeSkillContextAgent?.name
    ? `From ${activeSkillContextAgent.name}`
    : "From this agent";
  const launchQuickSkills =
    launchAgent?.skills
      .map((skillRef) => {
        const skill = skills?.find((candidate) => candidate.id === skillRef.id);
        return {
          id: skillRef.id,
          name: skillRef.name,
          description: skill?.description,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name)) ?? [];

  useEffect(() => {
    if (!agents?.length) {
      setLaunchAgentId("");
      return;
    }

    const preferredAgent =
      (preferredLaunchAgentId &&
        agents.find((agent) => agent.id === preferredLaunchAgentId)) ||
      null;
    const firstAgentWithSkills = agents.find((agent) => agent.skills.length > 0) || null;
    const fallbackAgentId = preferredAgent?.id ?? firstAgentWithSkills?.id ?? agents[0]?.id ?? "";

    setLaunchAgentId((currentValue) => {
      if (currentValue && agents.some((agent) => agent.id === currentValue)) {
        return currentValue;
      }

      return fallbackAgentId;
    });
  }, [agents, preferredLaunchAgentId]);

  const launchDescription = useMemo(() => {
    if (!hasAgents) {
      return "Create an agent first to start chatting.";
    }

    if (workspaceChatSettings?.defaultChatAgentId) {
      return "Use @agent in the message to override the current workspace default.";
    }

    return "Pick an agent now, or save one as the workspace default.";
  }, [hasAgents, workspaceChatSettings?.defaultChatAgentId]);

  const rightPanelContent = useMemo(() => {
    if (!conversationId && !isStreaming) {
      return null;
    }

    return (
      <ChatWorkspacePanel
        conversation={conversation}
        isStreaming={isStreaming}
        streamingActivities={streamingActivities}
        streamingPlan={streamingPlan}
      />
    );
  }, [conversation, conversationId, isStreaming, streamingActivities, streamingPlan]);

  useEffect(() => {
    setRightPanelContent(rightPanelContent);
  }, [rightPanelContent, setRightPanelContent]);

  useEffect(() => {
    return () => {
      setRightPanelContent(null);
    };
  }, [setRightPanelContent]);

  const handleSend = useCallback(
    async (content: string) => {
      await send({
        conversationId,
        content,
        launchAgentId: conversationId ? undefined : launchAgentId || undefined,
        onConversationCreated: (createdConversationId) => {
          navigate(`/chat/${createdConversationId}`);
        },
      });
    },
    [conversationId, launchAgentId, navigate, send],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{conversation?.title || "New conversation"}</span>
          {agentName && <span className="text-xs text-muted-foreground">with {agentName}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            {isNewConversationView && (
              <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 pt-36 pb-20 text-center">
                <div className="space-y-2">
                  <MessageSquareIcon className="mx-auto size-8 text-muted-foreground" />
                  <p className="text-lg font-medium">Start a new conversation</p>
                  <p className="text-sm text-muted-foreground">{launchDescription}</p>
                </div>

                {hasAgents ? (
                  <div className="w-full max-w-3xl rounded-2xl border bg-background shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3 text-left">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {launchAgentName
                            ? `Primary agent: ${launchAgentName}`
                            : "Choose a primary agent"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Conversations can still override this with explicit @mentions.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={isWorkspaceDefaultLaunchAgent ? "secondary" : "outline"}
                        disabled={
                          !launchAgentId ||
                          isWorkspaceDefaultLaunchAgent ||
                          updateWorkspaceChatSettings.isPending
                        }
                        onClick={() =>
                          updateWorkspaceChatSettings.mutate({
                            defaultChatAgentId: launchAgentId || null,
                          })
                        }
                      >
                        {isWorkspaceDefaultLaunchAgent ? "Workspace default" : "Make default"}
                      </Button>
                    </div>

                    <ChatInput
                      onSend={handleSend}
                      disabled={isStreaming}
                      showLaunchAgentPicker
                      launchAgentId={launchAgentId || undefined}
                      onLaunchAgentIdChange={setLaunchAgentId}
                      quickSkills={launchQuickSkills}
                      preferredSkillIds={preferredSkillIds}
                      preferredSkillLabel={preferredSkillLabel}
                      placeholder={
                        launchAgentName
                          ? `Message ${launchAgentName}...`
                          : "@agent or choose a primary agent..."
                      }
                    />
                  </div>
                ) : (
                  <Alert className="max-w-xl">
                    <AlertDescription>
                      No agents are available in this workspace yet.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {conversation?.entries.map((entry, index) => (
              <ChatMessage
                key={index}
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

        {!isNewConversationView && (
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            preferredSkillIds={preferredSkillIds}
            preferredSkillLabel={preferredSkillLabel}
            placeholder={conversationId ? "Type a message..." : "@agent start a conversation..."}
          />
        )}
    </div>
  );
}
