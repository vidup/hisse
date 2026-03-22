import { Link } from "react-router";
import { FolderCodeIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ToolSummary } from "@/lib/api";

interface ToolCardProps {
  tool: ToolSummary;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link to={`/tools/${encodeURIComponent(tool.name)}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>{tool.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <FolderCodeIcon className="size-3 shrink-0" />
            <span className="truncate font-mono">{tool.codePath}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
