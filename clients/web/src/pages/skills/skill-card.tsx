import { Link } from "react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { SkillSummary } from "@/lib/api";

interface SkillCardProps {
  skill: SkillSummary;
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link to={`/skills/${skill.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>{skill.name}</CardTitle>
          <CardDescription>{skill.description}</CardDescription>
        </CardHeader>
        {skill.content && (
          <CardContent>
            <p className="line-clamp-2 text-sm text-muted-foreground font-mono">
              {skill.content}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
