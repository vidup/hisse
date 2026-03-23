import { useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import { useStartTask, useMoveTask, useCompleteTask } from "@/hooks/use-projects";
import type { TaskSummary } from "@/lib/api";

interface BoardColumnProps {
  stepId: string;
  stepIndex: number;
  title: string;
  kind: "backlog" | "step" | "completed";
  tasks: TaskSummary[];
}

export function BoardColumn({ stepId, stepIndex, title, kind, tasks }: BoardColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { mutate: startTask } = useStartTask();
  const { mutate: moveTask } = useMoveTask();
  const { mutate: completeTask } = useCompleteTask();

  useEffect(() => {
    if (!ref.current) return;
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ stepId, stepIndex, kind }),
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: ({ source }) => {
        setIsDragOver(false);
        const taskId = source.data.taskId as string;
        const taskStatus = source.data.taskStatus as string;

        if (kind === "completed") {
          completeTask(taskId);
        } else if (kind === "step") {
          if (taskStatus === "backlog") {
            startTask({ taskId, stepId, stepIndex });
          } else {
            moveTask({ taskId, stepId, stepIndex });
          }
        }
      },
    });
  }, [stepId, stepIndex, kind, startTask, moveTask, completeTask]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-3",
        isDragOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
