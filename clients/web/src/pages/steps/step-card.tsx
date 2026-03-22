import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StepSummary } from "@/lib/api";

interface StepCardProps {
  step: StepSummary;
}

export function StepCard({ step }: StepCardProps) {
  const isAgent = Boolean(step.agentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step.name}
          <Badge variant={isAgent ? "default" : "secondary"}>
            {isAgent ? "Agent" : "Human"}
          </Badge>
        </CardTitle>
        <CardDescription>{step.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isAgent && step.agentId && (
          <p className="text-sm text-muted-foreground">
            Agent: {step.agentId}
          </p>
        )}
        {!isAgent && step.transports && step.transports.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {step.transports.map((t, i) => (
              <Badge key={i} variant="outline">
                {t.type}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
