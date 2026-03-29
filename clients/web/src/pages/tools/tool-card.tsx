import { Link } from "react-router";
import { FolderCodeIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import type { ToolSummary } from "@/lib/api";
import { ToolPathActions } from "./tool-path-actions";

interface ToolCardProps {
  tool: ToolSummary;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardHeader>
        <CardTitle>
          <Link to={`/tools/${encodeURIComponent(tool.name)}`} className="hover:underline">
            {tool.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          to={`/tools/${encodeURIComponent(tool.name)}`}
          className="block rounded-md outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <FolderCodeIcon className="size-3 shrink-0" />
            <span className="truncate font-mono">{tool.codePath}</span>
          </div>
        </Link>
      </CardContent>
      <CardFooter className="justify-end">
        <ToolPathActions targetPath={tool.codePath} size="xs" />
      </CardFooter>
    </Card>
  );
}
