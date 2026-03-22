import { Link } from "react-router";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TeamSummary } from "@/lib/api";

interface TeamCardProps {
  team: TeamSummary;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link to={`/teams/${team.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>{team.name}</CardTitle>
          <CardDescription>{team.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
