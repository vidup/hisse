import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ClipboardListIcon, GitBranchPlusIcon, PlusIcon, SaveIcon, WorkflowIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents } from "@/hooks/use-agents";
import { useProject, useProjectTasks, useUpdateProjectWorkflow } from "@/hooks/use-projects";
import { type ProjectWorkflowStepInput } from "@/lib/api";
import { PageLayout } from "@/layouts/page-layout";
import { AddTaskDialog } from "./add-task-dialog";
import { AddProjectStepDialog } from "./add-project-step-dialog";
import { BoardColumn } from "./board-column";
import { ProjectWorkflowStepItem } from "./project-workflow-step-item";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId!);
  const { data: tasks, isLoading: isTasksLoading } = useProjectTasks(projectId!);
  const { data: agents } = useAgents();
  const { mutate: saveWorkflow, isPending: isSaving } = useUpdateProjectWorkflow(projectId!);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "workflow">("workflow");
  const [workflowSteps, setWorkflowSteps] = useState<ProjectWorkflowStepInput[]>([]);

  useEffect(() => {
    if (!project) {
      return;
    }

    setWorkflowSteps(
      project.workflow.steps.map((step) =>
        step.kind === "agent"
          ? {
              kind: "agent" as const,
              name: step.name,
              description: step.description,
              agentId: step.agentId ?? "",
            }
          : {
              kind: "human" as const,
              name: step.name,
              description: step.description,
              transports: [
                {
                  type: "local",
                  target: "local",
                  configuration: {},
                  authenticated: false,
                },
              ],
            },
      ),
    );
  }, [project?.id, project?.updatedAt]);

  useEffect(() => {
    if (!project) {
      return;
    }

    setActiveTab(project.workflow.steps.length > 0 ? "tasks" : "workflow");
  }, [project?.id, project?.workflow.steps.length]);

  const isLoading = isProjectLoading || isTasksLoading;
  const savedWorkflowSteps = project?.workflow.steps ?? [];
  const hasSavedWorkflow = savedWorkflowSteps.length > 0;
  const isWorkflowDirty =
    JSON.stringify(workflowSteps) !==
    JSON.stringify(
      savedWorkflowSteps.map((step) =>
        step.kind === "agent"
          ? {
              kind: "agent" as const,
              name: step.name,
              description: step.description,
              agentId: step.agentId ?? "",
            }
          : {
              kind: "human" as const,
              name: step.name,
              description: step.description,
              transports: [
                {
                  type: "local",
                  target: "local",
                  configuration: {},
                  authenticated: false,
                },
              ],
            },
      ),
    );

  const columns = project
    ? [
        { stepId: "backlog", title: "Backlog", kind: "backlog" as const },
        ...savedWorkflowSteps.map((step) => ({
          stepId: step.id,
          title: step.name,
          kind: "step" as const,
        })),
        { stepId: "completed", title: "Completed", kind: "completed" as const },
      ]
    : [];

  function removeStep(index: number) {
    setWorkflowSteps((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function reorderSteps(sourceIndex: number, targetIndex: number) {
    setWorkflowSteps((current) => {
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function getTasksForColumn(kind: string, stepId: string) {
    if (!tasks) return [];
    if (kind === "backlog") return tasks.filter((task) => task.status === "backlog");
    if (kind === "completed") return tasks.filter((task) => task.status === "completed");
    return tasks.filter((task) => task.status === "in_progress" && task.currentStep?.id === stepId);
  }

  function handleSaveWorkflow() {
    saveWorkflow({ steps: workflowSteps });
  }

  function handleAddStep(step: ProjectWorkflowStepInput) {
    setWorkflowSteps((current) => [...current, step]);
  }

  return (
    <PageLayout
      title={project?.name ?? "..."}
      backTo="/projects"
      action={
        hasSavedWorkflow ? (
          <Button onClick={() => setTaskDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New Task
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : project ? (
        <div className="flex min-h-full flex-col gap-6">
          {project.description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "tasks" | "workflow")}
            className="min-h-0 flex-1 gap-6"
          >
            <TabsList variant="line">
              <TabsTrigger value="tasks">
                <ClipboardListIcon data-icon="inline-start" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="workflow">
                <WorkflowIcon data-icon="inline-start" />
                Workflow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="flex min-h-0 flex-1 flex-col gap-4">
              {hasSavedWorkflow ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-medium">Tasks</h2>
                      <p className="text-sm text-muted-foreground">
                        Tasks run against the saved workflow.
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {tasks?.length ?? 0} task{(tasks?.length ?? 0) > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="flex min-h-[24rem] flex-1 items-stretch gap-4 overflow-x-auto pb-1">
                    {columns.map((column) => (
                      <BoardColumn
                        key={`${column.kind}-${column.stepId}`}
                        stepId={column.stepId}
                        title={column.title}
                        kind={column.kind}
                        tasks={getTasksForColumn(column.kind, column.stepId)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Empty className="min-h-[24rem] flex-1 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardListIcon />
                    </EmptyMedia>
                    <EmptyTitle>No task board yet</EmptyTitle>
                    <EmptyDescription>
                      Create and save a workflow first. The task board will use the saved steps.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button type="button" variant="outline" onClick={() => setActiveTab("workflow")}>
                      <WorkflowIcon data-icon="inline-start" />
                      Go to Workflow
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </TabsContent>

            <TabsContent value="workflow" className="grid gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium">Workflow</h2>
                  <p className="text-sm text-muted-foreground">
                    Build the project workflow here, reorder steps, then save.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {workflowSteps.length} step{workflowSteps.length > 1 ? "s" : ""}
                  </Badge>
                  {isWorkflowDirty ? <Badge variant="outline">Unsaved changes</Badge> : null}
                  <Button type="button" variant="outline" onClick={() => setStepDialogOpen(true)}>
                    <GitBranchPlusIcon data-icon="inline-start" />
                    Add Step
                  </Button>
                  <Button onClick={handleSaveWorkflow} disabled={!isWorkflowDirty || isSaving}>
                    <SaveIcon data-icon="inline-start" />
                    {isSaving ? "Saving..." : "Save Workflow"}
                  </Button>
                </div>
              </div>

              {workflowSteps.length > 0 ? (
                <div className="grid gap-3">
                  {workflowSteps.map((step, index) => (
                    <ProjectWorkflowStepItem
                      key={`${step.kind}-${step.name}-${index}`}
                      step={step}
                      index={index}
                      agentName={
                        step.kind === "agent"
                          ? (agents?.find((agent) => agent.id === step.agentId)?.name ?? step.agentId)
                          : undefined
                      }
                      onRemove={() => removeStep(index)}
                      onReorder={reorderSteps}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border border-dashed">
                  <CardHeader>
                    <CardTitle>Start your workflow</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      Add the first step, then keep shaping the flow from there.
                    </p>
                    <div>
                      <Button type="button" onClick={() => setStepDialogOpen(true)}>
                        <PlusIcon data-icon="inline-start" />
                        Add First Step
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      <AddTaskDialog projectId={projectId!} open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      <AddProjectStepDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        agents={agents ?? []}
        onAdd={handleAddStep}
      />
    </PageLayout>
  );
}
