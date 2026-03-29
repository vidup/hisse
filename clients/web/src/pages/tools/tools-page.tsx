import { WrenchIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { PageLayout } from "@/layouts/page-layout";
import { useTools } from "@/hooks/use-tools";
import { useWorkspace } from "@/hooks/use-workspace";
import { ToolCard } from "./tool-card";
import { ToolPathActions } from "./tool-path-actions";

function joinPath(basePath: string, ...segments: string[]) {
  const normalizedBasePath = basePath.replace(/[\\/]+$/, "");
  const normalizedSegments = segments.map((segment) => segment.replace(/^[\\/]+|[\\/]+$/g, ""));
  return [normalizedBasePath, ...normalizedSegments].filter(Boolean).join("/");
}

export function ToolsPage() {
  const { data: tools, isLoading } = useTools();
  const { currentPath } = useWorkspace();
  const toolsRootPath = currentPath ? joinPath(currentPath, ".hisse", "tools") : "";

  return (
    <PageLayout
      title="Tools"
      action={
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Open .hisse/tools</span>
          <ToolPathActions targetPath={toolsRootPath} disabled={!toolsRootPath} />
        </div>
      }
    >
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && tools?.length === 0 && (
        <Empty className="min-h-[400px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WrenchIcon />
            </EmptyMedia>
            <EmptyTitle>No tools found</EmptyTitle>
            <EmptyDescription>
              Place tool folders in <code>.hisse/tools/</code> to make them available.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && tools && tools.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
