import { useCallback, useMemo, useRef, useState } from "react";
import { CornerDownLeftIcon, SendIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/hooks/use-agents";
import { useSkills } from "@/hooks/use-skills";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showLaunchAgentPicker?: boolean;
  launchAgentId?: string;
  onLaunchAgentIdChange?: (agentId: string) => void;
  quickSkills?: Array<{ id: string; name: string; description?: string }>;
}

const MENTION_REGEX = /(?:^|\s)@(\w[\w-]*)/;

function previewSkillContent(content: string): string {
  const preview = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");

  return preview.length > 0 ? preview : "No entry content preview available.";
}

export function ChatInput({
  onSend,
  disabled,
  placeholder,
  showLaunchAgentPicker = false,
  launchAgentId,
  onLaunchAgentIdChange,
  quickSkills = [],
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: agents } = useAgents();
  const { data: skills } = useSkills();

  const filteredAgents = useMemo(
    () =>
      (agents ?? [])
        .filter((agent) => agent.name.toLowerCase().includes(filter))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [agents, filter],
  );
  const filteredSkills = useMemo(
    () =>
      (skills ?? [])
        .filter((skill) => skill.name.toLowerCase().includes(filter))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [filter, skills],
  );
  const selectedSkill = filteredSkills[activeSkillIndex] ?? filteredSkills[0];
  const canSend =
    !!value.trim() &&
    !disabled &&
    (!showLaunchAgentPicker || !!launchAgentId || MENTION_REGEX.test(value));

  const handleSubmit = useCallback(() => {
    if (!canSend) return;

    onSend(value.trim());
    setValue("");
    setShowMentions(false);
    setShowSkills(false);
  }, [canSend, onSend, value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);

    const lastAt = text.lastIndexOf("@");
    const lastSlash = text.lastIndexOf("/");
    const lastSpace = Math.max(text.lastIndexOf(" "), text.lastIndexOf("\n"));

    if (lastAt > lastSpace) {
      setShowMentions(true);
      setShowSkills(false);
      setFilter(text.slice(lastAt + 1).toLowerCase());
      setActiveMentionIndex(0);
    } else if (lastSlash > lastSpace) {
      setShowSkills(true);
      setShowMentions(false);
      setFilter(text.slice(lastSlash + 1).toLowerCase());
      setActiveSkillIndex(0);
    } else {
      setShowMentions(false);
      setShowSkills(false);
    }
  }, []);

  const insertMention = useCallback(
    (name: string) => {
      const lastAt = value.lastIndexOf("@");
      const nextValue = value.slice(0, lastAt) + `@${name} `;
      setValue(nextValue);
      setShowMentions(false);
      setActiveMentionIndex(0);
      textareaRef.current?.focus();
    },
    [value],
  );

  const insertSkill = useCallback(
    (name: string) => {
      const lastSlash = value.lastIndexOf("/");
      const nextValue = value.slice(0, lastSlash) + `/${name} `;
      setValue(nextValue);
      setShowSkills(false);
      setActiveSkillIndex(0);
      textareaRef.current?.focus();
    },
    [value],
  );

  const insertQuickSkill = useCallback(
    (name: string) => {
      const normalizedValue = value.trim();
      const nextValue = normalizedValue ? `${normalizedValue} /${name} ` : `/${name} `;
      setValue(nextValue);
      setShowMentions(false);
      setShowSkills(false);
      setActiveSkillIndex(0);
      textareaRef.current?.focus();
    },
    [value],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showMentions && filteredAgents.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveMentionIndex((current) => (current + 1) % filteredAgents.length);
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveMentionIndex((current) =>
            current === 0 ? filteredAgents.length - 1 : current - 1,
          );
          return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          insertMention((filteredAgents[activeMentionIndex] ?? filteredAgents[0]).name);
          return;
        }
      }

      if (showSkills) {
        if (filteredSkills.length > 0 && e.key === "ArrowDown") {
          e.preventDefault();
          setActiveSkillIndex((current) => (current + 1) % filteredSkills.length);
          return;
        }

        if (filteredSkills.length > 0 && e.key === "ArrowUp") {
          e.preventDefault();
          setActiveSkillIndex((current) =>
            current === 0 ? filteredSkills.length - 1 : current - 1,
          );
          return;
        }

        if (filteredSkills.length > 0 && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          insertSkill((filteredSkills[activeSkillIndex] ?? filteredSkills[0]).name);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setShowSkills(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [
      activeMentionIndex,
      activeSkillIndex,
      filteredAgents,
      filteredSkills,
      handleSubmit,
      insertMention,
      insertSkill,
      showMentions,
      showSkills,
    ],
  );

  return (
    <div className="relative border-t p-3">
      {showMentions && filteredAgents.length > 0 && (
        <div className="absolute right-3 bottom-full left-3 z-20 mb-2 rounded-xl border bg-popover/95 p-1 shadow-xl backdrop-blur">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent",
                filteredAgents[activeMentionIndex]?.id === agent.id && "bg-accent",
              )}
              onClick={() => insertMention(agent.name)}
              onMouseEnter={() =>
                setActiveMentionIndex(filteredAgents.findIndex((candidate) => candidate.id === agent.id))
              }
            >
              <span className="font-medium">@{agent.name}</span>
              <span className="text-muted-foreground">{agent.description}</span>
            </button>
          ))}
        </div>
      )}

      {showSkills && (
        <div className="absolute right-3 bottom-full left-3 z-20 mb-3 overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Skills
              </p>
              <p className="text-sm font-medium">
                {filter ? `/${filter}` : "Type / to browse available skills"}
              </p>
            </div>
            <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <CornerDownLeftIcon className="size-3.5" />
              Enter to insert
            </div>
          </div>

          {filteredSkills.length > 0 ? (
            <div className="grid max-h-[24rem] grid-cols-1 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <ScrollArea className="h-[24rem] border-r">
                <div className="p-2">
                  {filteredSkills.map((skill, index) => (
                    <button
                      key={skill.id}
                      type="button"
                      className={cn(
                        "flex w-full flex-col items-start gap-1 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent",
                        index === activeSkillIndex && "bg-accent",
                      )}
                      onClick={() => insertSkill(skill.name)}
                      onMouseEnter={() => setActiveSkillIndex(index)}
                    >
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">/{skill.name}</span>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {skill.description || "No description provided."}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <div className="hidden h-[24rem] flex-col justify-between bg-muted/20 md:flex">
                {selectedSkill ? (
                  <>
                    <div className="space-y-4 p-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Selected skill
                        </p>
                        <p className="text-base font-semibold">/{selectedSkill.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSkill.description || "No description provided."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Preview
                        </p>
                        <div className="rounded-xl border bg-background px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap text-foreground/85">
                          {previewSkillContent(selectedSkill.content)}
                        </div>
                      </div>
                    </div>

                    <div className="border-t bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                      Skills are available as slash commands across the workspace.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-4 py-5 text-sm text-muted-foreground">
              No skills match <span className="font-medium">/{filter}</span>.
            </div>
          )}
        </div>
      )}

      {showLaunchAgentPicker && (
        <div className="mb-3 grid gap-3">
          <div className="text-xs font-medium text-muted-foreground">Start with</div>
          <Select
            value={launchAgentId || undefined}
            onValueChange={(nextValue) => onLaunchAgentIdChange?.(nextValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a primary agent" />
            </SelectTrigger>
            <SelectContent align="start">
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-2 text-left">
            <div className="text-xs font-medium text-muted-foreground">Quick actions</div>
            {quickSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {quickSkills.map((skill) => (
                  <Button
                    key={skill.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="max-w-full"
                    onClick={() => insertQuickSkill(skill.name)}
                    title={skill.description || skill.name}
                  >
                    /{skill.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {launchAgentId
                  ? "No skills attached to this agent yet."
                  : "Choose a primary agent to see its skills here."}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "@agent message..."}
          disabled={disabled}
          className="min-h-[120px] max-h-[260px] resize-none px-4 pt-4 pb-14 pr-16"
          rows={4}
        />
        <Button
          type="button"
          size="icon"
          className={`absolute right-3 bottom-3 transition-opacity ${
            value.trim().length > 0 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={handleSubmit}
          disabled={!canSend}
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
