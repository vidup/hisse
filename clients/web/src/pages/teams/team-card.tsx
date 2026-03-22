import { Link } from "react-router";
import { FolderIcon } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamSummary } from "@/lib/api";

interface TeamCardProps {
  team: TeamSummary;
}

export function TeamCard({ team }: TeamCardProps) {
  const stepCount = team.workflow.length;

  return (
    <Link to={`/teams/${team.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>{team.name}</CardTitle>
          <CardDescription>{team.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {stepCount} {stepCount === 1 ? "step" : "steps"}
            </Badge>
          </div>
          {team.folderPath && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <FolderIcon className="size-3 shrink-0" />
              <span className="truncate font-mono">{team.folderPath}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
