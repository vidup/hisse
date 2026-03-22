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
import { useCreateWorkflow } from "@/hooks/use-workflows";

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkflowDialog({ open, onOpenChange }: CreateWorkflowDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, isPending } = useCreateWorkflow();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name, description },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setDescription("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
          <DialogDescription>Create a workflow to define a sequence of steps.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="workflow-name">Name</Label>
            <Input
              id="workflow-name"
              placeholder="e.g. Code Review Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="workflow-description">Description</Label>
            <Input
              id="workflow-description"
              placeholder="What does this workflow do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
