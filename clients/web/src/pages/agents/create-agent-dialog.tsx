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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreateAgent } from "@/hooks/use-agents";
import { useSkills } from "@/hooks/use-skills";
import { useTools } from "@/hooks/use-tools";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDERS = ["anthropic", "openai-codex", "google", "ollama", "custom"] as const;

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedToolNames, setSelectedToolNames] = useState<string[]>([]);

  const { mutate, isPending } = useCreateAgent();
  const { data: skills } = useSkills();
  const { data: tools } = useTools();

  function reset() {
    setName("");
    setDescription("");
    setSystemPrompt("");
    setProvider("");
    setModel("");
    setSelectedSkillIds([]);
    setSelectedToolNames([]);
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  }

  function toggleTool(toolName: string) {
    setSelectedToolNames((prev) =>
      prev.includes(toolName) ? prev.filter((n) => n !== toolName) : [...prev, toolName],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      {
        name,
        description,
        systemPrompt,
        provider,
        model,
        tools: selectedToolNames,
        skills: selectedSkillIds,
      },
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
          <DialogTitle>New Agent</DialogTitle>
          <DialogDescription>
            Configure a new agent with a provider, model, and skills.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              placeholder="e.g. Code Reviewer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-description">Description</Label>
            <Input
              id="agent-description"
              placeholder="What does this agent do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-system-prompt">System Prompt</Label>
            <Textarea
              id="agent-system-prompt"
              placeholder="System instructions for the agent..."
              className="font-mono"
              rows={8}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agent-model">Model</Label>
              <Input
                id="agent-model"
                placeholder="e.g. claude-sonnet-4-20250514"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>
          </div>
          {skills && skills.length > 0 && (
            <div className="grid gap-2">
              <Label>Skills</Label>
              <ScrollArea className="h-32 rounded-lg border border-input p-2">
                <div className="flex flex-col gap-2">
                  {skills.map((skill) => (
                    <label key={skill.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedSkillIds.includes(skill.id)}
                        onCheckedChange={() => toggleSkill(skill.id)}
                      />
                      {skill.name}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          {tools && tools.length > 0 && (
            <div className="grid gap-2">
              <Label>Tools</Label>
              <ScrollArea className="h-32 rounded-lg border border-input p-2">
                <div className="flex flex-col gap-2">
                  {tools.map((tool) => (
                    <label key={tool.name} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedToolNames.includes(tool.name)}
                        onCheckedChange={() => toggleTool(tool.name)}
                      />
                      {tool.name}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
