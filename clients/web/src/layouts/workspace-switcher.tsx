import { useMemo, useState } from "react";
import { ArrowDownToLineIcon, FolderIcon, FolderOpenIcon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceImportDialog } from "./workspace-import-dialog";

function getWorkspaceName(workspacePath: string): string {
  const normalizedPath = workspacePath.replace(/[\\/]+$/, "");
  const segments = normalizedPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? workspacePath;
}

function shortenWorkspacePath(workspacePath: string): string {
  if (workspacePath.length <= 48) return workspacePath;
  return `${workspacePath.slice(0, 18)}...${workspacePath.slice(-24)}`;
}

export function WorkspaceSwitcher() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { currentPath, recentPaths, isChanging, canSwitch, pickWorkspace, switchWorkspace } =
    useWorkspace();
  const importableSourceCount = useMemo(
    () => recentPaths.filter((workspacePath) => workspacePath !== currentPath).length,
    [currentPath, recentPaths],
  );

  const currentLabel = currentPath ? getWorkspaceName(currentPath) : "No workspace selected";
  const currentDescription = currentPath
    ? shortenWorkspacePath(currentPath)
    : "Choose a folder to load a workspace.";

  return (
    <>
      <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-start gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary/12 text-sidebar-primary">
            <FolderIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.65rem] font-semibold tracking-[0.18em] text-sidebar-foreground/45 uppercase">
              Workspace
            </div>
            <div className="truncate text-sm font-semibold" title={currentPath || undefined}>
              {currentLabel}
            </div>
            <div className="truncate text-xs text-sidebar-foreground/65" title={currentPath || undefined}>
              {currentDescription}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => void pickWorkspace()}
            disabled={isChanging || !canSwitch}
            aria-label="Choose workspace"
          >
            {isChanging ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <FolderOpenIcon className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setImportDialogOpen(true)}
            disabled={isChanging || importableSourceCount === 0}
            aria-label="Import from another workspace"
          >
            <ArrowDownToLineIcon className="size-4" />
          </Button>
        </div>

        <div className="mt-3">
          <Select
            value={currentPath || undefined}
            onValueChange={(path) => void switchWorkspace(path)}
            disabled={isChanging || recentPaths.length === 0}
          >
            <SelectTrigger size="sm" className="w-full bg-sidebar/80">
              <SelectValue placeholder="Recent workspaces" />
            </SelectTrigger>
            <SelectContent align="start" className="max-w-[20rem]">
              <SelectGroup>
                <SelectLabel>Recent workspaces</SelectLabel>
                {recentPaths.map((workspacePath) => (
                  <SelectItem key={workspacePath} value={workspacePath}>
                    {getWorkspaceName(workspacePath)} · {shortenWorkspacePath(workspacePath)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="mt-2 text-[11px] text-sidebar-foreground/50">
            {recentPaths.length} saved {recentPaths.length > 1 ? "workspaces" : "workspace"} ·{" "}
            {importableSourceCount} import source{importableSourceCount > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="hidden group-data-[collapsible=icon]:inline-flex"
        onClick={() => void pickWorkspace()}
        disabled={isChanging || !canSwitch}
        aria-label="Choose workspace"
      >
        {isChanging ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <FolderOpenIcon className="size-4" />
        )}
      </Button>

      <WorkspaceImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </>
  );
}
