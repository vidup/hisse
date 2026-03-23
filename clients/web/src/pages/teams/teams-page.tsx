import { useState } from "react";
import { PlusIcon, UsersIcon } from "lucide-react";
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
import { useTeams } from "@/hooks/use-teams";
import { TeamCard } from "./team-card";
import { CreateTeamDialog } from "./create-team-dialog";

export function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageLayout
      title="Teams"
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Team
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>Create your first team to orchestrate workflows.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Create Team
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <CreateTeamDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
