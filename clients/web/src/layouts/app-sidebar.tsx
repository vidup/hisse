import { NavLink } from "react-router";
import {
  BookOpenIcon,
  BotIcon,
  GitBranchIcon,
  ListChecksIcon,
  MessageSquareIcon,
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

import { WorkspaceSwitcher } from "./workspace-switcher";

const navItems = [
  { to: "/skills", label: "Skills", icon: BookOpenIcon },
  { to: "/tools", label: "Tools", icon: WrenchIcon },
  { to: "/agents", label: "Agents", icon: BotIcon },
  { to: "/steps", label: "Steps", icon: ListChecksIcon },
  { to: "/workflows", label: "Workflows", icon: GitBranchIcon },
  { to: "/teams", label: "Teams", icon: UsersIcon },
  { to: "/connectors", label: "Connectors", icon: PlugIcon },
  { to: "/chat", label: "Chat", icon: MessageSquareIcon },
];

export function AppSidebar() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: api.health.check,
    refetchInterval: 5000,
  });

  const connected = health.isSuccess;

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
      <SidebarContent>
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
