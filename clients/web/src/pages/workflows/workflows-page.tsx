import { useState } from "react";
import { PlusIcon, GitBranchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { PageLayout } from "@/layouts/page-layout";
import { useWorkflows } from "@/hooks/use-workflows";
import { WorkflowCard } from "./workflow-card";
import { CreateWorkflowDialog } from "./create-workflow-dialog";

export function WorkflowsPage() {
  const { data: workflows, isLoading } = useWorkflows();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageLayout
      title="Workflows"
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Workflow
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : workflows && workflows.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitBranchIcon />
            </EmptyMedia>
            <EmptyTitle>No workflows yet</EmptyTitle>
            <EmptyDescription>
              Create your first workflow to define a sequence of steps.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create Workflow
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <CreateWorkflowDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
