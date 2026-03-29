import { useEffect, useRef, useState } from "react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type ProjectWorkflowStepInput } from "@/lib/api";
import { ToolPathActions } from "@/pages/tools/tool-path-actions";
import { useWorkspace } from "@/hooks/use-workspace";

function joinPath(basePath: string, ...segments: string[]) {
  return [basePath, ...segments].join("/").replace(/\/+/g, "/");
}

interface ProjectWorkflowStepItemProps {
  step: ProjectWorkflowStepInput;
  index: number;
  agentName?: string;
  codePath?: string;
  onRemove: () => void;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
}

export function ProjectWorkflowStepItem({
  step,
  index,
  agentName,
  codePath,
  onRemove,
  onReorder,
}: ProjectWorkflowStepItemProps) {
  const { currentPath } = useWorkspace();
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const cleanupDraggable = draggable({
      element: ref.current,
      getInitialData: () => ({ type: "project-workflow-step", index }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    const cleanupDropTarget = dropTargetForElements({
      element: ref.current,
      canDrop: ({ source }) => source.data.type === "project-workflow-step",
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: ({ source }) => {
        setIsDragOver(false);
        const sourceIndex = source.data.index;
        if (typeof sourceIndex === "number" && sourceIndex !== index) {
          onReorder(sourceIndex, index);
        }
      },
    });

    return () => {
      cleanupDraggable();
      cleanupDropTarget();
    };
  }, [index, onReorder]);

  return (
    <div ref={ref}>
      <Card className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-50", isDragOver && "ring-2 ring-primary/40")}>
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-border bg-muted/50 p-2 text-muted-foreground">
              <GripVerticalIcon className="size-4" />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">#{index + 1}</Badge>
                <Badge variant={step.kind === "agent" ? "default" : step.kind === "automation" ? "destructive" : "outline"}>
                  {step.kind === "agent" ? "Agent" : step.kind === "automation" ? "Automation" : "Human"}
                </Badge>
                <span className="font-medium">{step.name}</span>
              </div>

              {step.description ? (
                <p className="text-sm text-muted-foreground">{step.description}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                {step.kind === "agent"
                  ? `Agent: ${agentName ?? step.agentId}`
                  : step.kind === "automation"
                    ? "Automation: TypeScript"
                    : "Transport: in-app"}
              </p>

              {step.kind === "automation" && codePath && currentPath ? (
                <ToolPathActions
                  targetPath={joinPath(currentPath, ".hisse", codePath)}
                  folderPath={joinPath(currentPath, ".hisse", codePath, "..")}
                  size="xs"
                />
              ) : null}
            </div>
          </div>

          <Button type="button" size="icon-sm" variant="ghost" onClick={onRemove}>
            <Trash2Icon />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
