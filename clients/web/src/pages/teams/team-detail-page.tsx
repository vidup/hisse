import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeftIcon, PlusIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ListChecksIcon } from "lucide-react";
import { useTeams, useTeamWorkflow, useUpdateWorkflow } from "@/hooks/use-teams";
import { useStepsLibrary } from "@/hooks/use-steps";
import { WorkflowStepItem } from "./workflow-step-item";

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: teams } = useTeams();
  const { data: workflow, isLoading: isWorkflowLoading } = useTeamWorkflow(teamId!);
  const { data: stepsLibrary, isLoading: isStepsLoading } = useStepsLibrary();
  const { mutate: saveWorkflow, isPending: isSaving } = useUpdateWorkflow(teamId!);

  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const team = teams?.find((t) => t.id === teamId);

  useEffect(() => {
    if (workflow && !initialized) {
      setWorkflowSteps(workflow);
      setInitialized(true);
    }
  }, [workflow, initialized]);

  const stepsMap = useMemo(() => {
    const map = new Map<string, { name: string; isAgent: boolean }>();
    stepsLibrary?.forEach((s) => {
      map.set(s.id, { name: s.name, isAgent: Boolean(s.agentId) });
    });
    return map;
  }, [stepsLibrary]);

  const availableSteps = stepsLibrary ?? [];

  const isDirty = useMemo(() => {
    if (!workflow) return false;
    if (workflow.length !== workflowSteps.length) return true;
    return workflow.some((id, i) => id !== workflowSteps[i]);
  }, [workflow, workflowSteps]);

  function handleMoveUp(index: number) {
    if (index === 0) return;
    setWorkflowSteps((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function handleMoveDown(index: number) {
    setWorkflowSteps((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function handleRemove(index: number) {
    setWorkflowSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddStep(stepId: string) {
    setWorkflowSteps((prev) => [...prev, stepId]);
  }

  function handleSave() {
    saveWorkflow({ steps: workflowSteps });
  }

  const isLoading = isWorkflowLoading || isStepsLoading;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/teams">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <h1 className="font-heading text-xl font-semibold">{team?.name ?? teamId}</h1>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Workflow</h2>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            <SaveIcon data-icon="inline-start" />
            {isSaving ? "Saving..." : "Save Workflow"}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : workflowSteps.length > 0 ? (
          <div className="grid gap-2">
            {workflowSteps.map((stepId, index) => {
              const info = stepsMap.get(stepId);
              return (
                <WorkflowStepItem
                  key={`${index}-${stepId}`}
                  position={index + 1}
                  stepId={stepId}
                  stepName={info?.name ?? stepId}
                  isAgent={info?.isAgent ?? false}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onRemove={() => handleRemove(index)}
                  isFirst={index === 0}
                  isLast={index === workflowSteps.length - 1}
                />
              );
            })}
          </div>
        ) : (
          <Empty className="min-h-[200px] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecksIcon />
              </EmptyMedia>
              <EmptyTitle>No steps in workflow</EmptyTitle>
              <EmptyDescription>
                Add steps from the library to build this workflow.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!isLoading && availableSteps.length > 0 && (
          <div className="flex items-end gap-3">
            <div className="grid flex-1 gap-2">
              <span className="text-sm font-medium">Add Step</span>
              <Select onValueChange={handleAddStep}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a step to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableSteps.map((step) => (
                    <SelectItem key={step.id} value={step.id}>
                      {step.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
