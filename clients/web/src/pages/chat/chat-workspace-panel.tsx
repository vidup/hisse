import { useMemo } from "react";
import { FilePenLineIcon, ListTodoIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AgentMessageActivitySummary,
  ConversationDetail,
  ConversationPlanSummary,
} from "@/lib/api";

interface ChatWorkspacePanelProps {
  conversation?: ConversationDetail;
  isStreaming?: boolean;
  streamingActivities?: AgentMessageActivitySummary[];
  streamingPlan?: ConversationPlanSummary;
}

interface WorkingFileSummary {
  path: string;
  action: string;
  status: "running" | "completed" | "failed";
}

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

export function ChatWorkspacePanel({
  conversation,
  isStreaming = false,
  streamingActivities = [],
  streamingPlan,
}: ChatWorkspacePanelProps) {
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
        status: activity.status,
      });
    }

    return Array.from(latestByPath.values()).slice(0, 10);
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
      filesRead: Array.from(filesRead).slice(0, 10),
    };
  }, [allActivities, conversation]);

  return (
    <div className="space-y-4">
      <div className="space-y-1 px-1">
        <p className="text-sm font-semibold">Conversation workspace</p>
        <p className="text-xs text-muted-foreground">
          Follow the latest plan, touched files, and context used by the agent.
        </p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListTodoIcon className="size-4 text-muted-foreground" />
            Plan
          </CardTitle>
          <CardDescription>
            {latestPlan
              ? "Latest visible plan emitted by the agent."
              : "The agent has not published a plan yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FilePenLineIcon className="size-4 text-muted-foreground" />
            Working files
          </CardTitle>
          <CardDescription>
            Files the agent wrote, edited, or appended during the conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workingFiles.length > 0 ? (
            <div className="space-y-2">
              {workingFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.path}</p>
                    <p className="text-xs text-muted-foreground">{file.action}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      file.status === "failed"
                        ? "border-red-500/40 text-red-700"
                        : file.status === "running"
                          ? "border-amber-500/40 text-amber-700"
                          : "border-emerald-500/40 text-emerald-700"
                    }
                  >
                    {file.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No generated or modified files yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <SparklesIcon className="size-4 text-muted-foreground" />
            Context
          </CardTitle>
          <CardDescription>
            Quick summary of skills, tools, and files read during the run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
