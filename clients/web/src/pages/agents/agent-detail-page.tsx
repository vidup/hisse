import { useEffect } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgents, useAgentConfig } from "@/hooks/use-agents";
import { useRightPanel } from "@/layouts/right-panel";

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: config, isLoading: configLoading } = useAgentConfig(agentId!);
  const { setContent } = useRightPanel();

  const agent = agents?.find((a) => a.id === agentId);
  const isLoading = agentsLoading || configLoading;

  useEffect(() => {
    if (!config?.systemPrompt) return;

    setContent(
      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-sm font-medium">System Prompt</h3>
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {config.systemPrompt}
          </pre>
        </ScrollArea>
      </div>,
    );

    return () => setContent(null);
  }, [config?.systemPrompt, setContent]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!agent || !config) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <p className="text-muted-foreground">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="link" className="px-0" asChild>
            <Link to="/agents">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to Agents
            </Link>
          </Button>
        </div>
        <h1 className="font-heading text-xl font-semibold">{agent.name}</h1>
        {agent.description && <p className="text-sm text-muted-foreground">{agent.description}</p>}
      </div>

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
  );
}
