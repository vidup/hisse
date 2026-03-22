import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStep } from "@/hooks/use-steps";
import { useAgents } from "@/hooks/use-agents";

const AVAILABLE_TRANSPORTS = [
  { type: "local", label: "Local (in-app)" },
] as const;

interface CreateStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStepDialog({ open, onOpenChange }: CreateStepDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"agent" | "human">("agent");
  const [agentId, setAgentId] = useState("");
  const [selectedTransports, setSelectedTransports] = useState<string[]>(["local"]);

  const { mutate, isPending } = useCreateStep();
  const { data: agents } = useAgents();

  function reset() {
    setName("");
    setDescription("");
    setKind("agent");
    setAgentId("");
    setSelectedTransports(["local"]);
  }

  function toggleTransport(type: string) {
    setSelectedTransports((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parameters =
      kind === "agent"
        ? { kind: "agent" as const, agentId }
        : {
            kind: "human" as const,
            transports: selectedTransports.map((type) => ({
              type,
              target: type,
              configuration: {},
              authenticated: false,
            })),
          };

    mutate(
      { name, description, parameters },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Step</DialogTitle>
          <DialogDescription>Define a step for your workflow.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="step-name">Name</Label>
            <Input
              id="step-name"
              placeholder="e.g. Review Pull Request"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="step-description">Description</Label>
            <Input
              id="step-description"
              placeholder="What does this step do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "agent" | "human")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent Step</SelectItem>
                <SelectItem value="human">Human Step</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "agent" && (
            <div className="grid gap-2">
              <Label>Agent</Label>
              <Select value={agentId} onValueChange={setAgentId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "human" && (
            <div className="grid gap-2">
              <Label>Transports</Label>
              <p className="text-xs text-muted-foreground">
                Select how the human will be notified.
              </p>
              <div className="grid gap-2 rounded-lg border border-border p-3">
                {AVAILABLE_TRANSPORTS.map((transport) => (
                  <label
                    key={transport.type}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedTransports.includes(transport.type)}
                      onCheckedChange={() => toggleTransport(transport.type)}
                    />
                    {transport.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                isPending ||
                (kind === "human" && selectedTransports.length === 0)
              }
            >
              {isPending ? "Creating..." : "Create Step"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
