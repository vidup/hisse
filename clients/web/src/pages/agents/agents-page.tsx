import { useState } from "react";
import { PlusIcon, BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { PageLayout } from "@/layouts/page-layout";
import { useAgents } from "@/hooks/use-agents";
import { AgentCard } from "./agent-card";
import { CreateAgentDialog } from "./create-agent-dialog";

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageLayout
      title="Agents"
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Agent
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BotIcon />
            </EmptyMedia>
            <EmptyTitle>No agents yet</EmptyTitle>
            <EmptyDescription>Create your first agent to get started.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <CreateAgentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
