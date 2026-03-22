import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";

import { router } from "./router";
import { initWorkspace } from "./lib/api";
import "./style.css";

const queryClient = new QueryClient();

document.documentElement.classList.add("dark");

async function main() {
  await initWorkspace();

  ReactDOM.createRoot(document.getElementById("app")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

main();
