import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { PlusIcon, SaveIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/hooks/use-agents";
import { useProject, useProjectTasks, useUpdateProjectWorkflow } from "@/hooks/use-projects";
import { type ProjectWorkflowStepInput } from "@/lib/api";
import { PageLayout } from "@/layouts/page-layout";
import { AddTaskDialog } from "./add-task-dialog";
import { BoardColumn } from "./board-column";
import { ProjectWorkflowStepItem } from "./project-workflow-step-item";

const LOCAL_TRANSPORT = {
  type: "local",
  target: "local",
  configuration: {},
  authenticated: false,
} as const;

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading: isProjectLoading } = useProject(projectId!);
  const { data: tasks, isLoading: isTasksLoading } = useProjectTasks(projectId!);
  const { data: agents } = useAgents();
  const { mutate: saveWorkflow, isPending: isSaving } = useUpdateProjectWorkflow(projectId!);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [stepKind, setStepKind] = useState<"agent" | "human">("agent");
  const [stepName, setStepName] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [agentId, setAgentId] = useState("");
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
              transports: [{ ...LOCAL_TRANSPORT }],
            },
      ),
    );
  }, [project?.id, project?.updatedAt]);

  const isLoading = isProjectLoading || isTasksLoading;
  const savedWorkflowSteps = project?.workflow.steps ?? [];
  const hasSavedWorkflow = savedWorkflowSteps.length > 0;
  const canAddStep = stepName.trim().length > 0 && (stepKind === "human" || agentId.length > 0);
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
              transports: [{ ...LOCAL_TRANSPORT }],
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

  function resetStepDraft() {
    setStepKind("agent");
    setStepName("");
    setStepDescription("");
    setAgentId("");
  }

  function addStep() {
    const trimmedName = stepName.trim();
    if (trimmedName.length === 0) {
      return;
    }

    const nextStep: ProjectWorkflowStepInput =
      stepKind === "agent"
        ? {
            kind: "agent",
            name: trimmedName,
            description: stepDescription.trim(),
            agentId,
          }
        : {
            kind: "human",
            name: trimmedName,
            description: stepDescription.trim(),
            transports: [{ ...LOCAL_TRANSPORT }],
          };

    setWorkflowSteps((current) => [...current, nextStep]);
    resetStepDraft();
  }

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

  return (
    <PageLayout
      title={project?.name ?? "..."}
      backTo="/projects"
      action={
        <Button onClick={() => setDialogOpen(true)} disabled={!hasSavedWorkflow}>
          <PlusIcon data-icon="inline-start" />
          New Task
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : project ? (
        <div className="grid gap-6">
          {project.description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
          ) : null}

          <section className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Workflow</h2>
                <p className="text-sm text-muted-foreground">Add steps here, drag them to reorder, then save.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{workflowSteps.length} step{workflowSteps.length > 1 ? "s" : ""}</Badge>
                <Button onClick={handleSaveWorkflow} disabled={!isWorkflowDirty || isSaving}>
                  <SaveIcon data-icon="inline-start" />
                  {isSaving ? "Saving..." : "Save Workflow"}
                </Button>
              </div>
            </div>

            <Card className="border border-border bg-muted/20">
              <CardHeader>
                <CardTitle>Add Step</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Step Kind</Label>
                  <Select value={stepKind} onValueChange={(value) => setStepKind(value as "agent" | "human")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent Step</SelectItem>
                      <SelectItem value="human">Human Step</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="project-step-name">Step Name</Label>
                  <Input
                    id="project-step-name"
                    placeholder="e.g. Review Pull Request"
                    value={stepName}
                    onChange={(event) => setStepName(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="project-step-description">Step Description</Label>
                  <Textarea
                    id="project-step-description"
                    placeholder="Optional context for this step"
                    value={stepDescription}
                    onChange={(event) => setStepDescription(event.target.value)}
                  />
                </div>

                {stepKind === "agent" ? (
                  <div className="grid gap-2">
                    <Label>Agent</Label>
                    <Select value={agentId} onValueChange={setAgentId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    Human steps use the in-app transport for now.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="button" onClick={addStep} disabled={!canAddStep}>
                    <PlusIcon data-icon="inline-start" />
                    Add Step
                  </Button>
                </div>
              </CardContent>
            </Card>

            {workflowSteps.length > 0 ? (
              <div className="grid gap-3">
                {workflowSteps.map((step, index) => (
                  <ProjectWorkflowStepItem
                    key={`${step.kind}-${step.name}-${index}`}
                    step={step}
                    index={index}
                    agentName={step.kind === "agent" ? (agents?.find((agent) => agent.id === step.agentId)?.name ?? step.agentId) : undefined}
                    onRemove={() => removeStep(index)}
                    onReorder={reorderSteps}
                  />
                ))}
              </div>
            ) : (
              <Empty className="min-h-[180px] border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SaveIcon />
                  </EmptyMedia>
                  <EmptyTitle>No workflow yet</EmptyTitle>
                  <EmptyDescription>Add and save at least one step to unlock tasks.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>

          {hasSavedWorkflow ? (
            <section className="grid gap-4">
              <div>
                <h2 className="text-lg font-medium">Tasks</h2>
                <p className="text-sm text-muted-foreground">Tasks use the saved workflow only.</p>
              </div>
              <div className="flex h-full gap-4 overflow-x-auto">
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
            </section>
          ) : null}
        </div>
      ) : null}

      <AddTaskDialog projectId={projectId!} open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
