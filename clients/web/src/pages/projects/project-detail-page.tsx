import { useState } from "react";
import { useParams } from "react-router";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/layouts/page-layout";
import { useProject, useProjectTasks } from "@/hooks/use-projects";
import { BoardColumn } from "./board-column";
import { AddTaskDialog } from "./add-task-dialog";

export function ProjectDetailPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId!);
  const { data: tasks, isLoading: isTasksLoading } = useProjectTasks(projectId!);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isLoading = isProjectLoading || isTasksLoading;

  const columns = project
    ? [
        { stepId: "backlog", stepIndex: -1, title: "Backlog", kind: "backlog" as const },
        ...project.workflow.steps.map((step, index) => ({
          stepId: step.id,
          stepIndex: index,
          title: step.name,
          kind: "step" as const,
        })),
        { stepId: "completed", stepIndex: -2, title: "Completed", kind: "completed" as const },
      ]
    : [];

  function getTasksForColumn(kind: string, stepIndex: number) {
    if (!tasks) return [];
    if (kind === "backlog") return tasks.filter((t) => t.status === "backlog");
    if (kind === "completed") return tasks.filter((t) => t.status === "completed");
    return tasks.filter((t) => t.status === "in_progress" && t.currentStep?.index === stepIndex);
  }

  return (
    <PageLayout
      title={project?.name ?? "..."}
      backTo={`/teams/${teamId}`}
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Task
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex h-full gap-4">
          {columns.map((col) => (
            <BoardColumn
              key={`${col.kind}-${col.stepIndex}`}
              stepId={col.stepId}
              stepIndex={col.stepIndex}
              title={col.title}
              kind={col.kind}
              tasks={getTasksForColumn(col.kind, col.stepIndex)}
            />
          ))}
        </div>
      )}

      <AddTaskDialog projectId={projectId!} open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
