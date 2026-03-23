import { useParams, Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageLayoutWithPanel } from "@/layouts/page-layout";
import { useAgents, useAgentConfig } from "@/hooks/use-agents";

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: config, isLoading: configLoading } = useAgentConfig(agentId!);

  const agent = agents?.find((a) => a.id === agentId);
  const isLoading = agentsLoading || configLoading;

  if (isLoading) {
    return (
      <PageLayoutWithPanel
        title="..."
        backTo="/agents"
        panel={<Skeleton className="h-64 w-full" />}
      >
        <div className="flex flex-col gap-6">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageLayoutWithPanel>
    );
  }

  if (!agent || !config) {
    return (
      <PageLayoutWithPanel title="Agent" backTo="/agents" panel={null}>
        <p className="text-muted-foreground">Agent not found.</p>
      </PageLayoutWithPanel>
    );
  }

  return (
    <PageLayoutWithPanel
      title={agent.name}
      backTo="/agents"
      panel={
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-sm font-medium">System Prompt</h3>
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
              {config.systemPrompt}
            </pre>
          </ScrollArea>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {agent.description && <p className="text-sm text-muted-foreground">{agent.description}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Badge>{config.provider}</Badge>
          <Badge variant="outline">{config.model}</Badge>
        </div>

        {config.skills.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Skills</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {config.skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" asChild>
                  <Link to={`/skills/${skill.id}`}>{skill.name}</Link>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">System Prompt</h2>
          <pre className="whitespace-pre-wrap rounded-xl bg-muted/30 p-4 font-mono text-sm text-muted-foreground">
            {config.systemPrompt}
          </pre>
        </div>
      </div>
    </PageLayoutWithPanel>
  );
}
