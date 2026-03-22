import { WrenchIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { useTools } from "@/hooks/use-tools";
import { ToolCard } from "./tool-card";

export function ToolsPage() {
  const { data: tools, isLoading } = useTools();

  return (
    <div className="grid gap-6 p-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground">
          Tools discovered in the workspace. Add a tool by placing a folder in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.hisse/tools/</code>.
        </p>
      </div>

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
    </div>
  );
}
