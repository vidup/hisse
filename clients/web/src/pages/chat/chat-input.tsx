import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  preferredSkillIds?: string[];
  preferredSkillLabel?: string;
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
  preferredSkillIds = [],
  preferredSkillLabel = "From this agent",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skillOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { data: agents } = useAgents();
  const { data: skills } = useSkills();
  const preferredSkillIdSet = useMemo(() => new Set(preferredSkillIds), [preferredSkillIds]);

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
  const groupedSkillSections = useMemo(() => {
    const preferred = filteredSkills.filter((skill) => preferredSkillIdSet.has(skill.id));
    const others = filteredSkills.filter((skill) => !preferredSkillIdSet.has(skill.id));
    const sections: Array<{
      id: "preferred" | "workspace";
      label: string;
      skills: typeof filteredSkills;
      startIndex: number;
    }> = [];
    let startIndex = 0;

    if (preferred.length > 0) {
      sections.push({
        id: "preferred",
        label: preferredSkillLabel,
        skills: preferred,
        startIndex,
      });
      startIndex += preferred.length;
    }

    if (others.length > 0) {
      sections.push({
        id: "workspace",
        label: sections.length > 0 ? "More skills in this workspace" : "Skills",
        skills: others,
        startIndex,
      });
    }

    return sections;
  }, [filteredSkills, preferredSkillIdSet, preferredSkillLabel]);
  const orderedSkills = useMemo(
    () => groupedSkillSections.flatMap((section) => section.skills),
    [groupedSkillSections],
  );
  const selectedSkill = orderedSkills[activeSkillIndex] ?? orderedSkills[0];
  const trailingSkillDescription = useMemo(() => {
    if (showSkills) {
      return undefined;
    }

    const match = value.match(/(?:^|\s)\/([\w-]+)\s*$/);
    if (!match) {
      return undefined;
    }

    const skillName = match[1]?.toLowerCase();
    if (!skillName) {
      return undefined;
    }

    const matchingSkill = (skills ?? []).find(
      (candidate) => candidate.name.toLowerCase() === skillName,
    );

    return matchingSkill?.description?.trim() || undefined;
  }, [showSkills, skills, value]);
  const trailingSkillHint = useMemo(() => {
    if (!trailingSkillDescription || !value.trim()) {
      return undefined;
    }

    return `${value.endsWith(" ") ? "" : " "}${trailingSkillDescription}`;
  }, [trailingSkillDescription, value]);
  const canSend =
    !!value.trim() &&
    !disabled &&
    (!showLaunchAgentPicker || !!launchAgentId || MENTION_REGEX.test(value));

  useEffect(() => {
    if (!showSkills) {
      return;
    }

    const activeOption = skillOptionRefs.current[activeSkillIndex];
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeSkillIndex, showSkills]);

  useEffect(() => {
    if (orderedSkills.length === 0) {
      if (activeSkillIndex !== 0) {
        setActiveSkillIndex(0);
      }
      return;
    }

    if (activeSkillIndex >= orderedSkills.length) {
      setActiveSkillIndex(orderedSkills.length - 1);
    }
  }, [activeSkillIndex, orderedSkills.length]);

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
        if (orderedSkills.length > 0 && e.key === "ArrowDown") {
          e.preventDefault();
          setActiveSkillIndex((current) => (current + 1) % orderedSkills.length);
          return;
        }

        if (orderedSkills.length > 0 && e.key === "ArrowUp") {
          e.preventDefault();
          setActiveSkillIndex((current) =>
            current === 0 ? orderedSkills.length - 1 : current - 1,
          );
          return;
        }

        if (orderedSkills.length > 0 && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          insertSkill((orderedSkills[activeSkillIndex] ?? orderedSkills[0]).name);
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
      handleSubmit,
      insertMention,
      insertSkill,
      orderedSkills,
      showMentions,
      showSkills,
    ],
  );

  return (
    <div className="relative border-t p-3">
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
        {showMentions && filteredAgents.length > 0 && (
          <div className="absolute right-0 bottom-full left-0 z-20 mb-2 rounded-xl border bg-popover/95 p-1 shadow-xl backdrop-blur">
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
          <div className="absolute right-0 bottom-full left-0 z-20 mb-3 overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur">
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

            {orderedSkills.length > 0 ? (
              <div className="grid max-h-[24rem] grid-cols-1 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                <ScrollArea className="h-[24rem] border-r">
                  <div className="p-2">
                    {groupedSkillSections.map((section) => (
                      <div key={section.id} className="space-y-1">
                        <div className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {section.label}
                        </div>
                        {section.skills.map((skill, index) => {
                          const globalIndex = section.startIndex + index;
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              ref={(node) => {
                                skillOptionRefs.current[globalIndex] = node;
                              }}
                              className={cn(
                                "flex w-full flex-col items-start gap-1 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent",
                                globalIndex === activeSkillIndex && "bg-accent",
                              )}
                              onClick={() => insertSkill(skill.name)}
                              onMouseEnter={() => setActiveSkillIndex(globalIndex)}
                            >
                              <div className="flex items-center gap-2">
                                <SparklesIcon className="size-3.5 text-muted-foreground" />
                                <span className="font-medium">/{skill.name}</span>
                              </div>
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {skill.description || "No description provided."}
                              </p>
                            </button>
                          );
                        })}
                      </div>
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

        {trailingSkillHint ? (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden px-4 pt-4 pb-14 pr-16 text-base whitespace-pre-wrap break-words text-transparent md:text-sm">
            {value}
            <span className="text-muted-foreground/55">{trailingSkillHint}</span>
          </div>
        ) : null}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "@agent message..."}
          disabled={disabled}
          className="relative z-0 min-h-[120px] max-h-[260px] resize-none px-4 pt-4 pb-14 pr-16"
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
