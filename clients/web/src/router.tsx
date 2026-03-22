import { createBrowserRouter, Navigate } from "react-router";

import { AppLayout } from "./layouts/app-layout";
import { SkillsPage } from "./pages/skills/skills-page";
import { SkillDetailPage } from "./pages/skills/skill-detail-page";
import { AgentsPage } from "./pages/agents/agents-page";
import { AgentDetailPage } from "./pages/agents/agent-detail-page";
import { StepsPage } from "./pages/steps/steps-page";
import { TeamsPage } from "./pages/teams/teams-page";
import { TeamDetailPage } from "./pages/teams/team-detail-page";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/skills" replace /> },
      { path: "skills", element: <SkillsPage /> },
      { path: "skills/:skillId", element: <SkillDetailPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "agents/:agentId", element: <AgentDetailPage /> },
      { path: "steps", element: <StepsPage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "teams/:teamId", element: <TeamDetailPage /> },
    ],
  },
]);
