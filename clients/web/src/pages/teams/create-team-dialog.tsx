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
import { useCreateTeam } from "@/hooks/use-teams";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, isPending } = useCreateTeam();

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
          <DialogTitle>New Team</DialogTitle>
          <DialogDescription>Create a team to orchestrate multi-step workflows.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              placeholder="e.g. Backend Review Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="team-description">Description</Label>
            <Input
              id="team-description"
              placeholder="What does this team handle?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
