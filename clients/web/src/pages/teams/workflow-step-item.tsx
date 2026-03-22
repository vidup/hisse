import { ChevronUpIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WorkflowStepItemProps {
  position: number;
  stepId: string;
  stepName: string;
  isAgent: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function WorkflowStepItem({
  position,
  stepName,
  isAgent,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: WorkflowStepItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
      <span className="text-sm font-medium text-muted-foreground">{position}</span>
      <span className="flex-1 text-sm font-medium">{stepName}</span>
      <Badge variant={isAgent ? "default" : "secondary"}>{isAgent ? "Agent" : "Human"}</Badge>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={isFirst}>
          <ChevronUpIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={isLast}>
          <ChevronDownIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRemove}>
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
