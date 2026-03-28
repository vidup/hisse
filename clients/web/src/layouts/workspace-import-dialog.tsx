import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLineIcon,
  BookOpenIcon,
  BotIcon,
  LoaderCircleIcon,
  WrenchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImportWorkspaceContent, useWorkspaceImportPreview } from "@/hooks/use-workspace-import";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";

interface WorkspaceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getWorkspaceName(workspacePath: string): string {
  const normalizedPath = workspacePath.replace(/[\\/]+$/, "");
  const segments = normalizedPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? workspacePath;
}

function toggleSelection(currentValues: string[], value: string): string[] {
  return currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value];
}

export function WorkspaceImportDialog({ open, onOpenChange }: WorkspaceImportDialogProps) {
  const { currentPath, recentPaths } = useWorkspace();
  const [sourceWorkspacePath, setSourceWorkspacePath] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedToolNames, setSelectedToolNames] = useState<string[]>([]);
  const importMutation = useImportWorkspaceContent();

  const availableSourcePaths = useMemo(
    () => recentPaths.filter((workspacePath) => workspacePath !== currentPath),
    [currentPath, recentPaths],
  );

  useEffect(() => {
    if (!open) return;

    setSourceWorkspacePath((currentSourcePath) =>
      availableSourcePaths.includes(currentSourcePath)
        ? currentSourcePath
        : (availableSourcePaths[0] ?? ""),
    );
  }, [availableSourcePaths, open]);

  useEffect(() => {
    if (!open) return;

    setSelectedAgentIds([]);
    setSelectedSkillIds([]);
    setSelectedToolNames([]);
  }, [open, sourceWorkspacePath]);

  const previewQuery = useWorkspaceImportPreview(sourceWorkspacePath || null, open);

  const requiredSkillIds = useMemo(() => {
    const requiredSkills = new Set<string>();

    for (const agent of previewQuery.data?.agents ?? []) {
      if (!selectedAgentIds.includes(agent.id)) continue;
      for (const skillId of agent.skillIds) {
        requiredSkills.add(skillId);
      }
    }

    return requiredSkills;
  }, [previewQuery.data?.agents, selectedAgentIds]);

  const requiredToolNames = useMemo(() => {
    const requiredTools = new Set<string>();

    for (const agent of previewQuery.data?.agents ?? []) {
      if (!selectedAgentIds.includes(agent.id)) continue;
      for (const toolName of agent.toolNames) {
        requiredTools.add(toolName);
      }
    }

    return requiredTools;
  }, [previewQuery.data?.agents, selectedAgentIds]);

  const effectiveSkillIds = useMemo(() => {
    return new Set([...selectedSkillIds, ...requiredSkillIds]);
  }, [requiredSkillIds, selectedSkillIds]);

  const effectiveToolNames = useMemo(() => {
    return new Set([...selectedToolNames, ...requiredToolNames]);
  }, [requiredToolNames, selectedToolNames]);

  const canImport =
    !!sourceWorkspacePath &&
    (selectedAgentIds.length > 0 || selectedSkillIds.length > 0 || selectedToolNames.length > 0);

  const importError =
    importMutation.error instanceof Error ? importMutation.error.message : null;
  const previewError = previewQuery.error instanceof Error ? previewQuery.error.message : null;

  function closeDialog() {
    importMutation.reset();
    onOpenChange(false);
  }

  function handleImport() {
    if (!sourceWorkspacePath) return;

    importMutation.mutate(
      {
        sourceWorkspacePath,
        agentIds: selectedAgentIds,
        skillIds: selectedSkillIds,
        toolNames: selectedToolNames,
      },
      {
        onSuccess: () => {
          closeDialog();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import from another workspace</DialogTitle>
          <DialogDescription>
            Choose a recent workspace, preview its agents, skills, and tools, then import only what
            you need into the current workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Source workspace</div>
            <Select
              value={sourceWorkspacePath || undefined}
              onValueChange={setSourceWorkspacePath}
              disabled={availableSourcePaths.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a recent workspace" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectLabel>Recent workspaces</SelectLabel>
                  {availableSourcePaths.map((workspacePath) => (
                    <SelectItem key={workspacePath} value={workspacePath}>
                      {getWorkspaceName(workspacePath)} · {workspacePath}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {availableSourcePaths.length === 0 && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No other recent workspace is available yet. Open another workspace first, then come
              back here to import from it.
            </div>
          )}

          {sourceWorkspacePath && previewQuery.isLoading && (
            <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Loading workspace contents...
            </div>
          )}

          {previewError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {previewError}
            </div>
          )}

          {previewQuery.data && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <BotIcon className="size-3" />
                  {previewQuery.data.agents.length} agents
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <BookOpenIcon className="size-3" />
                  {previewQuery.data.skills.length} skills
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <WrenchIcon className="size-3" />
                  {previewQuery.data.tools.length} tools
                </Badge>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="grid min-h-0 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Agents</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedAgentIds.length} selected
                    </div>
                  </div>
                  <ScrollArea className="h-80 rounded-xl border">
                    <div className="grid gap-2 p-3">
                      {previewQuery.data.agents.length === 0 && (
                        <div className="text-sm text-muted-foreground">No agents found.</div>
                      )}
                      {previewQuery.data.agents.map((agent) => (
                        <label
                          key={agent.id}
                          className="grid gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedAgentIds.includes(agent.id)}
                              onCheckedChange={() =>
                                setSelectedAgentIds((currentValues) =>
                                  toggleSelection(currentValues, agent.id),
                                )
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{agent.name}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {agent.provider} · {agent.model}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{agent.description}</div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary">{agent.skillIds.length} skills</Badge>
                            <Badge variant="secondary">{agent.toolNames.length} tools</Badge>
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid min-h-0 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Skills</div>
                    <div className="text-xs text-muted-foreground">
                      {effectiveSkillIds.size} selected
                    </div>
                  </div>
                  <ScrollArea className="h-80 rounded-xl border">
                    <div className="grid gap-2 p-3">
                      {previewQuery.data.skills.length === 0 && (
                        <div className="text-sm text-muted-foreground">No skills found.</div>
                      )}
                      {previewQuery.data.skills.map((skill) => {
                        const requiredByAgent = requiredSkillIds.has(skill.id);
                        const checked = effectiveSkillIds.has(skill.id);

                        return (
                          <label
                            key={skill.id}
                            className={cn(
                              "grid gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40",
                              requiredByAgent && "bg-muted/30",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={checked}
                                disabled={requiredByAgent}
                                onCheckedChange={() =>
                                  setSelectedSkillIds((currentValues) =>
                                    toggleSelection(currentValues, skill.id),
                                  )
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate font-medium">{skill.name}</span>
                                  {requiredByAgent && (
                                    <Badge variant="secondary">required by agent</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {skill.description}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid min-h-0 gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Tools</div>
                    <div className="text-xs text-muted-foreground">
                      {effectiveToolNames.size} selected
                    </div>
                  </div>
                  <ScrollArea className="h-80 rounded-xl border">
                    <div className="grid gap-2 p-3">
                      {previewQuery.data.tools.length === 0 && (
                        <div className="text-sm text-muted-foreground">No tools found.</div>
                      )}
                      {previewQuery.data.tools.map((tool) => {
                        const requiredByAgent = requiredToolNames.has(tool.name);
                        const checked = effectiveToolNames.has(tool.name);

                        return (
                          <label
                            key={tool.name}
                            className={cn(
                              "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40",
                              requiredByAgent && "bg-muted/30",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={requiredByAgent}
                              onCheckedChange={() =>
                                setSelectedToolNames((currentValues) =>
                                  toggleSelection(currentValues, tool.name),
                                )
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-medium">{tool.name}</span>
                                {requiredByAgent && (
                                  <Badge variant="secondary">required by agent</Badge>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}

          {importError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {importError}
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!canImport || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowDownToLineIcon data-icon="inline-start" />
            )}
            Import selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
