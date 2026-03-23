import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayoutWithPanel } from "@/layouts/page-layout";
import { useSkill, useUpdateSkill } from "@/hooks/use-skills";

export function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const { data: skill, isLoading } = useSkill(skillId!);
  const { mutate, isPending } = useUpdateSkill(skillId!);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description);
      setContent(skill.content);
    }
  }, [skill]);

  const isDirty = useCallback(() => {
    if (!skill) return false;
    return name !== skill.name || description !== skill.description || content !== skill.content;
  }, [skill, name, description, content]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { name, description, content },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <PageLayoutWithPanel
        title="..."
        backTo="/skills"
        panel={<Skeleton className="h-64 w-full" />}
      >
        <div className="grid gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayoutWithPanel>
    );
  }

  return (
    <PageLayoutWithPanel
      title={name || "Skill"}
      backTo="/skills"
      action={
        <Button type="submit" form="skill-form" disabled={!isDirty() || isPending}>
          {isPending ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      }
      panel={
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-sm font-medium">Content Preview</h3>
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {content}
          </pre>
        </div>
      }
    >
      <form id="skill-form" onSubmit={handleSave} className="grid gap-4 max-w-2xl">
        <div className="grid gap-2">
          <Label htmlFor="detail-name">Name</Label>
          <Input id="detail-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="detail-description">Description</Label>
          <Input
            id="detail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="detail-content">Content</Label>
          <Textarea
            id="detail-content"
            className="font-mono"
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
      </form>
    </PageLayoutWithPanel>
  );
}
