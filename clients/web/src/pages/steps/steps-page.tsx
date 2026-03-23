import { useState } from "react";
import { PlusIcon, ListChecksIcon } from "lucide-react";
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
import { useStepsLibrary } from "@/hooks/use-steps";
import { StepCard } from "./step-card";
import { CreateStepDialog } from "./create-step-dialog";

export function StepsPage() {
  const { data: steps, isLoading } = useStepsLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageLayout
      title="Steps Library"
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Step
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : steps && steps.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecksIcon />
            </EmptyMedia>
            <EmptyTitle>No steps yet</EmptyTitle>
            <EmptyDescription>
              Create your first step to define how work gets done.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create Step
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <CreateStepDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
