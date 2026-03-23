import { useEffect, useRef, useState } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaskSummary } from "@/lib/api";

interface TaskCardProps {
  task: TaskSummary;
}

export function TaskCard({ task }: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    return draggable({
      element: ref.current,
      getInitialData: () => ({ taskId: task.id, taskStatus: task.status }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [task.id, task.status]);

  return (
    <div ref={ref}>
      <Card className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-50")}>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">{task.name}</CardTitle>
          {task.description && (
            <CardDescription className="text-xs">{task.description}</CardDescription>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}
