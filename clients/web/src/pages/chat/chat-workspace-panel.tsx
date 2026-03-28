import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePenLineIcon,
  ListTodoIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AgentMessageActivitySummary,
  ConversationDetail,
  ConversationPlanSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatWorkspacePanelProps {
  conversation?: ConversationDetail;
  isStreaming?: boolean;
  streamingActivities?: AgentMessageActivitySummary[];
  streamingPlan?: ConversationPlanSummary;
}

interface WorkingFileSummary {
  path: string;
  action: string;
  actionCode: string;
  status: "running" | "completed" | "failed";
}

type SectionKey = "plan" | "files" | "context";

const WORKING_FILE_TOOL_NAMES = new Set(["write", "edit", "append"]);
const READ_CONTEXT_TOOL_NAMES = new Set(["read", "ReadAgentSkill", "ReadAgentSkillFile"]);

function extractSlashSkills(text: string): string[] {
  const matches = text.matchAll(/(?:^|\s)\/([\w-]+)/g);
  const seen = new Set<string>();
  const skills: string[] = [];

  for (const match of matches) {
    const name = match[1];
    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    skills.push(name);
  }

  return skills;
}

function extractPathFromActivity(activity: AgentMessageActivitySummary): string | null {
  switch (activity.name) {
    case "write":
      return activity.label.replace(/^Write\s+/, "").trim();
    case "edit":
      return activity.label.replace(/^Edit\s+/, "").trim();
    case "append":
      return activity.label.replace(/^Append\s+/, "").trim();
    case "read":
      return activity.label.replace(/^Read\s+/, "").trim();
    case "ReadAgentSkillFile":
      return activity.label.replace(/^Read skill file\s+/, "").trim();
    default:
      return null;
  }
}

function formatActionLabel(activity: AgentMessageActivitySummary): string {
  switch (activity.name) {
    case "write":
      return "Wrote";
    case "edit":
      return "Edited";
    case "append":
      return "Appended";
    default:
      return activity.name;
  }
}

function formatActionCode(activity: AgentMessageActivitySummary): string {
  switch (activity.name) {
    case "write":
      return "W";
    case "edit":
      return "E";
    case "append":
      return "A";
    default:
      return activity.name.charAt(0).toUpperCase();
  }
}

interface PanelSectionCardProps {
  sectionKey: SectionKey;
  title: string;
  description: string;
  icon: LucideIcon;
  isOpen: boolean;
  onToggle: (sectionKey: SectionKey) => void;
  badge?: string;
  children: ReactNode;
}

function PanelSectionCard({
  sectionKey,
  title,
  description,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  children,
}: PanelSectionCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card/90 shadow-sm",
        isOpen ? "flex min-h-0 shrink basis-auto flex-col" : "shrink-0",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className={cn(
          "flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/20",
          isOpen ? "border-b border-border/60" : undefined,
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
            {badge ? (
              <Badge variant="outline" className="px-2 py-0 text-[10px] uppercase tracking-[0.12em]">
                {badge}
              </Badge>
            ) : null}
          </div>
          {isOpen ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {isOpen ? (
          <ChevronDownIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-3 pt-2 pb-3">
              {children}
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}

export function ChatWorkspacePanel({
  conversation,
  isStreaming = false,
  streamingActivities = [],
  streamingPlan,
}: ChatWorkspacePanelProps) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    plan: true,
    files: true,
    context: true,
  });

  const latestPlan = useMemo(() => {
    if (streamingPlan) {
      return streamingPlan;
    }

    if (!conversation) {
      return undefined;
    }

    for (let index = conversation.entries.length - 1; index >= 0; index -= 1) {
      const entry = conversation.entries[index];
      if (entry.kind === "assistant_turn" && entry.plan) {
        return entry.plan;
      }
    }

    return undefined;
  }, [conversation, streamingPlan]);

  const allActivities = useMemo(() => {
    const persisted = conversation?.entries.flatMap((entry) =>
      entry.kind === "assistant_turn" ? entry.activities : [],
    ) ?? [];

    return [...persisted, ...streamingActivities];
  }, [conversation, streamingActivities]);

  const workingFiles = useMemo(() => {
    const latestByPath = new Map<string, WorkingFileSummary>();

    for (let index = allActivities.length - 1; index >= 0; index -= 1) {
      const activity = allActivities[index];
      if (!WORKING_FILE_TOOL_NAMES.has(activity.name)) {
        continue;
      }

      const path = extractPathFromActivity(activity);
      if (!path || latestByPath.has(path)) {
        continue;
      }

      latestByPath.set(path, {
        path,
        action: formatActionLabel(activity),
        actionCode: formatActionCode(activity),
        status: activity.status,
      });
    }

    return Array.from(latestByPath.values());
  }, [allActivities]);

  const context = useMemo(() => {
    const skills = new Set<string>();
    const tools = new Set<string>();
    const filesRead = new Set<string>();

    for (const entry of conversation?.entries ?? []) {
      if (entry.kind === "user_turn") {
        for (const skill of extractSlashSkills(entry.text)) {
          skills.add(skill);
        }
      }
    }

    for (const activity of allActivities) {
      tools.add(activity.name);

      if (READ_CONTEXT_TOOL_NAMES.has(activity.name)) {
        const path = extractPathFromActivity(activity);
        filesRead.add(path || activity.label);
      }
    }

    return {
      skills: Array.from(skills),
      tools: Array.from(tools),
      filesRead: Array.from(filesRead),
    };
  }, [allActivities, conversation]);

  const handleToggleSection = (sectionKey: SectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 space-y-1 px-1">
        <p className="text-sm font-semibold">Conversation workspace</p>
        <p className="text-xs text-muted-foreground">
          Follow the latest plan, touched files, and context used by the agent.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <PanelSectionCard
          sectionKey="plan"
          title="Plan"
          description={latestPlan
            ? "Latest visible plan emitted by the agent."
            : "The agent has not published a plan yet."}
          icon={ListTodoIcon}
          isOpen={openSections.plan}
          onToggle={handleToggleSection}
          badge={latestPlan ? `${latestPlan.steps.length} steps` : undefined}
        >
          {latestPlan ? (
            <div className="space-y-2">
              {latestPlan.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <span className="text-sm">{step.label}</span>
                  <Badge
                    variant="outline"
                    className={
                      step.status === "completed"
                        ? "border-emerald-500/40 text-emerald-700"
                        : step.status === "in_progress"
                          ? "border-amber-500/40 text-amber-700"
                          : "border-foreground/15 text-muted-foreground"
                    }
                  >
                    {step.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          )}
        </PanelSectionCard>

        <PanelSectionCard
          sectionKey="files"
          title="Working files"
          description="Latest touched files. W = write, E = edit, A = append."
          icon={FilePenLineIcon}
          isOpen={openSections.files}
          onToggle={handleToggleSection}
          badge={workingFiles.length > 0 ? `${workingFiles.length}` : undefined}
        >
          {workingFiles.length > 0 ? (
            <div className="space-y-2">
              {workingFiles.map((file) => (
                <div
                  key={file.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2",
                    file.status === "failed"
                      ? "border-red-500/30 bg-red-500/5"
                      : file.status === "running"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border/60 bg-muted/20",
                  )}
                  title={`${file.action} ${file.path}`}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold uppercase",
                      file.status === "failed"
                        ? "border-red-500/40 bg-red-500/10 text-red-700"
                        : file.status === "running"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                          : "border-border/60 bg-background/70 text-muted-foreground",
                    )}
                  >
                    {file.actionCode}
                  </div>
                  <p className="truncate text-sm font-medium">{file.path}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No generated or modified files yet.
            </p>
          )}
        </PanelSectionCard>

        <PanelSectionCard
          sectionKey="context"
          title="Context"
          description="Quick summary of skills, tools, and files read during the run."
          icon={SparklesIcon}
          isOpen={openSections.context}
          onToggle={handleToggleSection}
          badge={context.tools.length > 0 ? `${context.tools.length} tools` : undefined}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Skills
              </p>
              {context.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {context.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      /{skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No explicit skill invocation yet.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Tools used
              </p>
              {context.tools.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {context.tools.map((tool) => (
                    <Badge key={tool} variant="outline">
                      {tool}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isStreaming ? "Waiting for the first tool call..." : "No tool usage yet."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Files read
              </p>
              {context.filesRead.length > 0 ? (
                <div className="space-y-2">
                  {context.filesRead.map((file) => (
                    <div
                      key={file}
                      className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No file reads captured yet.</p>
              )}
            </div>
          </div>
        </PanelSectionCard>
      </div>
    </div>
  );
}
