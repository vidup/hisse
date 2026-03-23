import { useState } from "react";
import { PlusIcon, BookOpenIcon } from "lucide-react";
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
import { useSkills } from "@/hooks/use-skills";
import { SkillCard } from "./skill-card";
import { CreateSkillDialog } from "./create-skill-dialog";

export function SkillsPage() {
  const { data: skills, isLoading } = useSkills();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageLayout
      title="Skills"
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Skill
        </Button>
      }
    >
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid gap-3 rounded-xl border p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && skills?.length === 0 && (
        <Empty className="min-h-[400px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon />
            </EmptyMedia>
            <EmptyTitle>No skills yet</EmptyTitle>
            <EmptyDescription>
              Create your first skill to give your agents reusable knowledge.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create Skill
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {!isLoading && skills && skills.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}

      <CreateSkillDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
