import { Outlet } from "react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";
import { RightPanel, RightPanelProvider } from "./right-panel";

export function AppLayout() {
  return (
    <RightPanelProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <div className="flex h-full overflow-hidden">
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </main>
            <RightPanel />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </RightPanelProvider>
  );
}
