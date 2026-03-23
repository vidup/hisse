import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddTask } from "@/hooks/use-projects";

interface AddTaskDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskDialog({ projectId, open, onOpenChange }: AddTaskDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { mutate, isPending } = useAddTask(projectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ name, description }, {
      onSuccess: () => {
        onOpenChange(false);
        setName("");
        setDescription("");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>Create a task in the backlog.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-name">Name</Label>
            <Input id="task-name" placeholder="e.g. Add user authentication" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" placeholder="What needs to be done?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
