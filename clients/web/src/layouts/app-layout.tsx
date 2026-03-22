import { Outlet } from "react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";
import { RightPanel, RightPanelProvider } from "./right-panel";

export function AppLayout() {
  return (
    <RightPanelProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-svh">
            <main className="flex flex-1 flex-col gap-6 p-6">
              <Outlet />
            </main>
            <RightPanel />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </RightPanelProvider>
  );
}
