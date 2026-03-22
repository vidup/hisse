import { Link } from "react-router";
import { FolderIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
        {team.folderPath && (
          <CardContent>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <FolderIcon className="size-3 shrink-0" />
              <span className="truncate font-mono">{team.folderPath}</span>
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
