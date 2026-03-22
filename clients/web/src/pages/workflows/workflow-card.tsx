import { Link } from "react-router";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WorkflowSummary } from "@/lib/api";

interface WorkflowCardProps {
  workflow: WorkflowSummary;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <Link to={`/workflows/${workflow.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>{workflow.name}</CardTitle>
          <CardDescription>{workflow.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
