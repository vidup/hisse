import { Outlet } from "react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider, useWorkspace } from "@/hooks/use-workspace";

import { AppSidebar } from "./app-sidebar";
import { RightPanel, RightPanelProvider } from "./right-panel";

export function AppLayout() {
  return (
    <RightPanelProvider>
      <WorkspaceProvider>
        <SidebarProvider>
          <AppSidebar />
          <AppLayoutContent />
        </SidebarProvider>
      </WorkspaceProvider>
    </RightPanelProvider>
  );
}

function AppLayoutContent() {
  const { currentPath } = useWorkspace();

  return (
    <SidebarInset className="overflow-hidden">
      <div key={currentPath || "no-workspace"} className="flex h-full overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        <RightPanel />
      </div>
    </SidebarInset>
  );
}
