import { PlusIcon } from "lucide-react";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversations } from "@/hooks/use-chat";

interface ChatConversationListProps {
  activeId?: string;
  onNewChat: () => void;
}

export function ChatConversationList({ activeId, onNewChat }: ChatConversationListProps) {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-medium">Conversations</span>
        <Button variant="ghost" size="icon" className="size-7" onClick={onNewChat}>
          <PlusIcon className="size-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading && <p className="p-2 text-xs text-muted-foreground">Loading...</p>}
          {conversations?.map((conv) => (
            <NavLink
              key={conv.id}
              to={`/chat/${conv.id}`}
              className={`block truncate rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                activeId === conv.id ? "bg-accent font-medium" : ""
              }`}
            >
              {conv.title}
            </NavLink>
          ))}
          {!isLoading && conversations?.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">No conversations yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
