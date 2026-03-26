import { useState, useRef, useCallback } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/hooks/use-agents";
import { useSkills } from "@/hooks/use-skills";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [filter, setFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: agents } = useAgents();
  const { data: skills } = useSkills();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !disabled) {
          onSend(value.trim());
          setValue("");
          setShowMentions(false);
          setShowSkills(false);
        }
      }
    },
    [value, disabled, onSend],
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);

    // Check for @mention trigger
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
      const newValue = value.slice(0, lastAt) + `@${name} `;
      setValue(newValue);
      setShowMentions(false);
      textareaRef.current?.focus();
    },
    [value],
  );

  const insertSkill = useCallback(
    (name: string) => {
      const lastSlash = value.lastIndexOf("/");
      const newValue = value.slice(0, lastSlash) + `/${name} `;
      setValue(newValue);
      setShowSkills(false);
      textareaRef.current?.focus();
    },
    [value],
  );

  const filteredAgents = agents?.filter((a) => a.name.toLowerCase().includes(filter)) || [];
  const filteredSkills = skills?.filter((s) => s.name.toLowerCase().includes(filter)) || [];

  return (
    <div className="relative border-t p-3">
      {/* Mention dropdown */}
      {showMentions && filteredAgents.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md border bg-popover p-1 shadow-md">
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

      {/* Skill dropdown */}
      {showSkills && filteredSkills.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md border bg-popover p-1 shadow-md">
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

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "@agent message..."}
          disabled={disabled}
          className="min-h-[40px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button
          size="icon"
          onClick={() => {
            if (value.trim() && !disabled) {
              onSend(value.trim());
              setValue("");
            }
          }}
          disabled={disabled || !value.trim()}
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
