import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import {
  BookOpenIcon,
  BotIcon,
  GitBranchIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PlusIcon,
  PlugIcon,
  SparklesIcon,
  WrenchIcon,
  UsersIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useConversations } from "@/hooks/use-chat";

import { WorkspaceSwitcher } from "./workspace-switcher";

const navItems = [
  { to: "/skills", label: "Skills", icon: BookOpenIcon },
  { to: "/tools", label: "Tools", icon: WrenchIcon },
  { to: "/agents", label: "Agents", icon: BotIcon },
  { to: "/steps", label: "Steps", icon: ListChecksIcon },
  { to: "/workflows", label: "Workflows", icon: GitBranchIcon },
  { to: "/teams", label: "Teams", icon: UsersIcon },
  { to: "/connectors", label: "Connectors", icon: PlugIcon },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showRecents, setShowRecents] = useState(true);
  const health = useQuery({
    queryKey: ["health"],
    queryFn: api.health.check,
    refetchInterval: 5000,
  });
  const { data: conversations, isLoading: isLoadingConversations } = useConversations();

  const connected = health.isSuccess;
  const activeConversationId = location.pathname.startsWith("/chat")
    ? location.pathname.split("/")[2]
    : undefined;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <SparklesIcon />
          </div>
          <div className="grid min-w-0 flex-1 text-left">
            <span className="truncate font-medium">Hisse</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Workflow orchestration
            </span>
          </div>
        </div>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
          <div className="group/recents-header flex h-8 items-center justify-between px-2">
            <SidebarGroupLabel className="h-auto p-0">Recents</SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <SidebarGroupLabel
                className="flex shrink-0 items-center rounded-md text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 h-auto p-0 opacity-0 hover:text-sidebar-foreground group-hover/recents-header:opacity-100 group-focus-within/recents-header:opacity-100"
              >
                <button
                  type="button"
                  className="appearance-none border-0 bg-transparent p-0 text-inherit font-inherit leading-inherit shadow-none outline-none"
                  onClick={() => setShowRecents((current) => !current)}
                >
                  {showRecents ? "Hide" : "Show"}
                </button>
              </SidebarGroupLabel>
              <button
                type="button"
                aria-label="New chat"
                title="New chat"
                className="flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => navigate("/chat")}
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          </div>

          {showRecents ? (
            <SidebarGroupContent className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <SidebarMenu>
                  {isLoadingConversations ? (
                    <div className="px-2 py-2 text-xs text-sidebar-foreground/70">
                      Loading...
                    </div>
                  ) : conversations && conversations.length > 0 ? (
                    conversations.map((conversation) => (
                      <SidebarMenuItem key={conversation.id}>
                        <NavLink to={`/chat/${conversation.id}`}>
                          <SidebarMenuButton
                            isActive={activeConversationId === conversation.id}
                            size="sm"
                            tooltip={conversation.title}
                          >
                            <MessageSquareIcon />
                            <span>{conversation.title}</span>
                          </SidebarMenuButton>
                        </NavLink>
                      </SidebarMenuItem>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-xs text-sidebar-foreground/70">
                      No conversations yet.
                    </div>
                  )}
                </SidebarMenu>
              </ScrollArea>
            </SidebarGroupContent>
          ) : null}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/70">
          <Badge variant={connected ? "default" : "destructive"} className="gap-1">
            {connected ? <WifiIcon className="size-3" /> : <WifiOffIcon className="size-3" />}
            {connected ? "Connected" : "Offline"}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
