import { useState } from "react";
import { ChevronRightIcon, FolderIcon, FolderOpenIcon, FolderUpIcon } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateTeam, useBrowseFolders } from "@/hooks/use-teams";

const isElectron = typeof window !== "undefined" && !!window.electron;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [browsingPath, setBrowsingPath] = useState<string | undefined>(undefined);
  const [selectedFolder, setSelectedFolder] = useState("");

  const { mutate, isPending } = useCreateTeam();
  const { data: browseResult, isLoading: isBrowsing } = useBrowseFolders(
    isElectron ? undefined : browsingPath,
  );

  function reset() {
    setName("");
    setDescription("");
    setBrowsingPath(undefined);
    setSelectedFolder("");
  }

  async function handlePickNative() {
    const folder = await window.electron!.pickFolder();
    if (folder) setSelectedFolder(folder);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name, description, folderPath: selectedFolder },
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
      <DialogContent className="sm:max-w-lg">
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

          <div className="grid gap-2">
            <Label>Folder</Label>
            {selectedFolder ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono">
                  {selectedFolder}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFolder("");
                    setBrowsingPath(undefined);
                  }}
                >
                  Change
                </Button>
              </div>
            ) : isElectron ? (
              <Button type="button" variant="outline" onClick={handlePickNative}>
                <FolderOpenIcon data-icon="inline-start" />
                Choose folder
              </Button>
            ) : (
              <div className="rounded-lg border border-border">
                {browseResult && (
                  <div className="border-b border-border px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                    {browseResult.current}
                  </div>
                )}
                <ScrollArea className="h-48">
                  <div className="grid gap-0.5 p-1">
                    {browseResult?.parent && (
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                        onClick={() => setBrowsingPath(browseResult.parent!)}
                      >
                        <FolderUpIcon className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">..</span>
                      </button>
                    )}
                    {isBrowsing && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    )}
                    {browseResult?.folders.map((folder) => (
                      <div key={folder.path} className="flex items-center">
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                          onClick={() => setSelectedFolder(folder.path)}
                        >
                          <FolderIcon className="size-4 text-muted-foreground" />
                          <span className="truncate">{folder.name}</span>
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1 hover:bg-muted/50"
                          onClick={() => setBrowsingPath(folder.path)}
                          title="Browse into"
                        >
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                    {browseResult && browseResult.folders.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No subfolders
                      </div>
                    )}
                  </div>
                </ScrollArea>
                {browseResult && (
                  <div className="border-t border-border p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedFolder(browseResult.current)}
                    >
                      Select current folder
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedFolder}>
              {isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
