import { createBrowserRouter, Navigate } from "react-router";

import { AppLayout } from "./layouts/app-layout";
import { SkillsPage } from "./pages/skills/skills-page";
import { SkillDetailPage } from "./pages/skills/skill-detail-page";
import { AgentsPage } from "./pages/agents/agents-page";
import { AgentDetailPage } from "./pages/agents/agent-detail-page";
import { ProjectsPage } from "./pages/projects/projects-page";
import { ToolsPage } from "./pages/tools/tools-page";
import { ToolDetailPage } from "./pages/tools/tool-detail-page";
import { ProjectDetailPage } from "./pages/projects/project-detail-page";
import { ConnectorsPage } from "./pages/connectors/connectors-page";
import { ChatPage } from "./pages/chat/chat-page";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/skills" replace /> },
      { path: "skills", element: <SkillsPage /> },
      { path: "skills/:skillId", element: <SkillDetailPage /> },
      { path: "tools", element: <ToolsPage /> },
      { path: "tools/:toolName", element: <ToolDetailPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "agents/:agentId", element: <AgentDetailPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "connectors", element: <ConnectorsPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "chat/:conversationId", element: <ChatPage /> },
    ],
  },
]);
