import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, CircleHelpIcon, LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ConversationQuestionAnswerSummary,
  ConversationQuestionSummary,
  QuestionnaireArtifactSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface QuestionDraft {
  selectedOptionIds: string[];
  comment: string;
}

interface ChatQuestionnaireProps {
  artifact: QuestionnaireArtifactSummary;
  disabled?: boolean;
  onSubmit?: (artifactId: string, answers: ConversationQuestionAnswerSummary[]) => Promise<void>;
}

function createDrafts(artifact: QuestionnaireArtifactSummary): Record<string, QuestionDraft> {
  return Object.fromEntries(
    artifact.questions.map((question) => {
      const answer = artifact.answers.find((candidate) => candidate.questionId === question.id);
      return [
        question.id,
        {
          selectedOptionIds: answer?.selectedOptionIds ?? [],
          comment: answer?.comment ?? "",
        },
      ];
    }),
  );
}

function isQuestionAnswered(draft: QuestionDraft | undefined): boolean {
  return !!draft && (draft.selectedOptionIds.length > 0 || draft.comment.trim().length > 0);
}

function renderAnswerSummary(
  question: ConversationQuestionSummary,
  answers: ConversationQuestionAnswerSummary[],
): string {
  const answer = answers.find((candidate) => candidate.questionId === question.id);
  if (!answer) {
    return "No response recorded.";
  }

  const selectedLabels = answer.selectedOptionIds
    .map((optionId) => question.options.find((option) => option.id === optionId)?.label)
    .filter((label): label is string => !!label);
  const trimmedComment = answer.comment.trim();

  if (selectedLabels.length > 0 && trimmedComment.length > 0) {
    return `${selectedLabels.join(", ")}\n${trimmedComment}`;
  }

  if (selectedLabels.length > 0) {
    return selectedLabels.join(", ");
  }

  return trimmedComment || "No response recorded.";
}

function getQuestionModeMeta(question: ConversationQuestionSummary): {
  badgeLabel: string;
  helperLabel: string;
  optionShapeClassName: string;
  indicatorClassName: string;
} {
  if (question.type === "multi_select") {
    return {
      badgeLabel: "Multiple choice",
      helperLabel: "You can select several options.",
      optionShapeClassName: "rounded-lg",
      indicatorClassName: "rounded-[4px]",
    };
  }

  return {
    badgeLabel: "Single choice",
    helperLabel: "You can select only one option.",
    optionShapeClassName: "rounded-full",
    indicatorClassName: "rounded-full",
  };
}

export function ChatQuestionnaire({
  artifact,
  disabled,
  onSubmit,
}: ChatQuestionnaireProps) {
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>(() => createDrafts(artifact));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(createDrafts(artifact));
    setError(null);
  }, [artifact]);

  const canSubmit = useMemo(
    () => artifact.questions.every((question) => isQuestionAnswered(drafts[question.id])),
    [artifact.questions, drafts],
  );

  const handleSingleSelect = (questionId: string, optionId: string) => {
    setDrafts((current) => {
      const previous = current[questionId] ?? { selectedOptionIds: [], comment: "" };
      const nextSelectedOptionIds =
        previous.selectedOptionIds[0] === optionId ? [] : [optionId];

      return {
        ...current,
        [questionId]: {
          ...previous,
          selectedOptionIds: nextSelectedOptionIds,
        },
      };
    });
  };

  const handleMultiSelect = (questionId: string, optionId: string) => {
    setDrafts((current) => {
      const previous = current[questionId] ?? { selectedOptionIds: [], comment: "" };
      const hasOption = previous.selectedOptionIds.includes(optionId);

      return {
        ...current,
        [questionId]: {
          ...previous,
          selectedOptionIds: hasOption
            ? previous.selectedOptionIds.filter((candidate) => candidate !== optionId)
            : [...previous.selectedOptionIds, optionId],
        },
      };
    });
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? { selectedOptionIds: [], comment: "" }),
        comment,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!onSubmit || !canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(
        artifact.id,
        artifact.questions.map((question) => ({
          questionId: question.id,
          selectedOptionIds: drafts[question.id]?.selectedOptionIds ?? [],
          comment: drafts[question.id]?.comment ?? "",
        })),
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit the response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = artifact.status === "answered" || !onSubmit;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CircleHelpIcon className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">
              {artifact.title || "Structured questions"}
            </p>
          </div>
          {artifact.instructions ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {artifact.instructions}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Each question includes a free-text field so you can answer outside the predefined choices.
            </p>
          )}
        </div>
        <Badge variant={artifact.status === "answered" ? "secondary" : "outline"}>
          {artifact.status === "answered" ? "Answered" : "Waiting"}
        </Badge>
      </div>

      <div className="space-y-5 px-4 py-4">
        {artifact.questions.map((question, index) => {
          const draft = drafts[question.id];
          const answered = isQuestionAnswered(draft);
          const modeMeta = getQuestionModeMeta(question);

          return (
            <div key={question.id} className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {index + 1}. {question.label}
                      </p>
                      <Badge variant="outline" className="text-[11px]">
                        {modeMeta.badgeLabel}
                      </Badge>
                    </div>
                    {question.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {question.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {modeMeta.helperLabel}
                    </p>
                  </div>
                  {artifact.status === "answered" && (
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  )}
                </div>
              </div>

              {isReadOnly ? (
                <div className="rounded-xl bg-muted/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {renderAnswerSummary(question, artifact.answers)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => {
                      const isSelected = draft?.selectedOptionIds.includes(option.id) ?? false;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={isSelected}
                          className={cn(
                            "inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors",
                            modeMeta.optionShapeClassName,
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-accent hover:text-accent-foreground",
                          )}
                          disabled={disabled || isSubmitting}
                          onClick={() =>
                            question.type === "multi_select"
                              ? handleMultiSelect(question.id, option.id)
                              : handleSingleSelect(question.id, option.id)
                          }
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-3 shrink-0 border transition-colors",
                              modeMeta.indicatorClassName,
                              isSelected
                                ? "border-current bg-current/90"
                                : "border-current/50 bg-transparent",
                            )}
                          />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Your own answer
                    </p>
                    <Textarea
                      value={draft?.comment ?? ""}
                      onChange={(event) => handleCommentChange(question.id, event.target.value)}
                      disabled={disabled || isSubmitting}
                      placeholder="Add context, nuance, constraints, or an alternative answer."
                      className="min-h-24 resize-y bg-background"
                    />
                  </div>

                  {!answered ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Select at least one option or write a free-text answer.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {!isReadOnly ? (
          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Submit these answers to the agent</p>
              <p className="text-xs text-muted-foreground">
                The response is sent as a mechanical summary generated by the app.
              </p>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
            <Button
              type="button"
              disabled={disabled || isSubmitting || !canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
