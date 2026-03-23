import { useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeftIcon, FolderIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { useTeams } from "@/hooks/use-teams";
import { useProjects } from "@/hooks/use-projects";
import { CreateProjectDialog } from "./create-project-dialog";

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: teams } = useTeams();
  const { data: projects, isLoading } = useProjects(teamId!);
  const [dialogOpen, setDialogOpen] = useState(false);

  const team = teams?.find((t) => t.id === teamId);

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
          <h2 className="text-lg font-medium">Projects</h2>
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} to={`/teams/${teamId}/projects/${project.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      Workflow: {project.workflowId}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Empty className="min-h-[200px] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderIcon />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create a project to run a workflow in a specific folder.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Create Project
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </div>

      <CreateProjectDialog
        teamId={teamId!}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
