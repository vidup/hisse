import { useParams } from "react-router";
import { FileCodeIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/layouts/page-layout";
import { useTool } from "@/hooks/use-tools";

export function ToolDetailPage() {
  const { toolName } = useParams<{ toolName: string }>();
  const { data: tool, isLoading } = useTool(toolName!);

  return (
    <PageLayout title={toolName ?? "..."} backTo="/tools">
      {isLoading && (
        <div className="grid gap-4">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {tool && (
        <div className="grid gap-4">
          {Object.entries(tool.files).map(([fileName, content]) => (
            <Card key={fileName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-mono">
                  <FileCodeIcon className="size-4" />
                  {fileName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-sm font-mono text-muted-foreground">
                  {content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
