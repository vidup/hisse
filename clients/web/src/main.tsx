import React from "react";
import ReactDOM from "react-dom/client";

import { TooltipProvider } from "@/components/ui/tooltip";

import { App } from "./App";
import "./style.css";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>,
);
