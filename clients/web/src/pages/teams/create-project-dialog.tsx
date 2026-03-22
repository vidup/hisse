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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProject } from "@/hooks/use-projects";
import { useWorkflows } from "@/hooks/use-workflows";

interface CreateProjectDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ teamId, open, onOpenChange }: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [workflowId, setWorkflowId] = useState("");

  const { mutate, isPending } = useCreateProject(teamId);
  const { data: workflows } = useWorkflows();

  function reset() {
    setName("");
    setPath("");
    setWorkflowId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name, path, workflowId },
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
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>Create a project to run a workflow in a folder.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Frontend App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-path">Path</Label>
            <Input
              id="project-path"
              placeholder="e.g. /home/user/projects/frontend"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-workflow">Workflow</Label>
            <Select value={workflowId} onValueChange={setWorkflowId} required>
              <SelectTrigger id="project-workflow" className="w-full">
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows?.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id}>
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !workflowId}>
              {isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
