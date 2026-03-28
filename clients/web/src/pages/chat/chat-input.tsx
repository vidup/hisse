import { useCallback, useRef, useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: agents } = useAgents();
  const { data: skills } = useSkills();

  const filteredAgents = agents?.filter((agent) => agent.name.toLowerCase().includes(filter)) || [];
  const filteredSkills = skills?.filter((skill) => skill.name.toLowerCase().includes(filter)) || [];
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

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
    } else if (lastSlash > lastSpace) {
      setShowSkills(true);
      setShowMentions(false);
      setFilter(text.slice(lastSlash + 1).toLowerCase());
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
      textareaRef.current?.focus();
    },
    [value],
  );

  return (
    <div className="relative border-t p-3">
      {showMentions && filteredAgents.length > 0 && (
        <div className="absolute right-3 bottom-full left-3 mb-1 rounded-md border bg-popover p-1 shadow-md">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => insertMention(agent.name)}
            >
              <span className="font-medium">@{agent.name}</span>
              <span className="text-muted-foreground">{agent.description}</span>
            </button>
          ))}
        </div>
      )}

      {showSkills && filteredSkills.length > 0 && (
        <div className="absolute right-3 bottom-full left-3 mb-1 rounded-md border bg-popover p-1 shadow-md">
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => insertSkill(skill.name)}
            >
              <span className="font-medium">/{skill.name}</span>
              <span className="text-muted-foreground">{skill.description}</span>
            </button>
          ))}
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
