import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AgentSummary, ProjectWorkflowStepInput } from "@/lib/api";

const LOCAL_TRANSPORT = {
  type: "local",
  target: "local",
  configuration: {},
  authenticated: false,
} as const;

type StepKind = "agent" | "human" | "automation";

interface AddProjectStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentSummary[];
  onAdd: (step: ProjectWorkflowStepInput) => void;
}

export function AddProjectStepDialog({
  open,
  onOpenChange,
  agents,
  onAdd,
}: AddProjectStepDialogProps) {
  const [stepKind, setStepKind] = useState<StepKind>("agent");
  const [stepName, setStepName] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [agentId, setAgentId] = useState("");

  useEffect(() => {
    if (open) {
      return;
    }

    setStepKind("agent");
    setStepName("");
    setStepDescription("");
    setAgentId("");
  }, [open]);

  const canSubmit =
    stepName.trim().length > 0 &&
    (stepKind === "human" || stepKind === "automation" || agentId.length > 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = stepName.trim();
    if (!trimmedName) {
      return;
    }

    let nextStep: ProjectWorkflowStepInput;

    if (stepKind === "agent") {
      nextStep = {
        kind: "agent",
        name: trimmedName,
        description: stepDescription.trim(),
        agentId,
      };
    } else if (stepKind === "automation") {
      nextStep = {
        kind: "automation",
        name: trimmedName,
        description: stepDescription.trim(),
      };
    } else {
      nextStep = {
        kind: "human",
        name: trimmedName,
        description: stepDescription.trim(),
        transports: [{ ...LOCAL_TRANSPORT }],
      };
    }

    onAdd(nextStep);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Step</DialogTitle>
          <DialogDescription>
            Create the next workflow step for this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Step Kind</Label>
            <Select value={stepKind} onValueChange={(value) => setStepKind(value as StepKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent Step</SelectItem>
                <SelectItem value="human">Human Step</SelectItem>
                <SelectItem value="automation">Automation Step</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-step-name">Step Name</Label>
            <Input
              id="project-step-name"
              placeholder="e.g. Review Pull Request"
              value={stepName}
              onChange={(event) => setStepName(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-step-description">Step Description</Label>
            <Textarea
              id="project-step-description"
              placeholder="Optional context for this step"
              value={stepDescription}
              onChange={(event) => setStepDescription(event.target.value)}
              rows={4}
            />
          </div>

          {stepKind === "agent" ? (
            <div className="grid gap-2">
              <Label>Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : stepKind === "automation" ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              A TypeScript file will be created automatically. Open it in your editor to implement the logic.
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              Human steps use the in-app transport for now.
            </div>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={!canSubmit}>
              Add Step
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
