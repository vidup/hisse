export type ConversationEntryId = string;
export type ConversationActivityKind = "tool";
export type ConversationActivityStatus = "running" | "completed" | "failed";
export type AssistantTurnStatus = "in_progress" | "completed" | "failed";
export type ConversationPlanStepStatus = "pending" | "in_progress" | "completed";
export type ConversationArtifactKind = "questionnaire";
export type ConversationArtifactStatus = "pending" | "answered";
export type ConversationQuestionType = "yes_no" | "single_select" | "multi_select" | "scale";

const YES_NO_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
] as const;

export interface ConversationActivity {
  id: string;
  kind: ConversationActivityKind;
  name: string;
  label: string;
  status: ConversationActivityStatus;
  startedAt: Date;
  completedAt?: Date;
}

export interface ConversationPlanStep {
  id: string;
  label: string;
  status: ConversationPlanStepStatus;
}

export interface ConversationPlan {
  steps: ConversationPlanStep[];
  updatedAt: Date;
}

export interface ConversationQuestionOption {
  id: string;
  label: string;
}

export interface ConversationQuestionScaleMark {
  value: number;
  label?: string;
}

export interface ConversationQuestionScaleRange {
  min: number;
  max: number;
  step: number;
  unit?: string;
  marks?: ConversationQuestionScaleMark[];
}

export interface ConversationQuestionDefinition {
  id: string;
  label: string;
  type: ConversationQuestionType;
  description?: string;
  options?: ConversationQuestionOption[];
  range?: ConversationQuestionScaleRange;
}

export interface ConversationQuestionAnswer {
  questionId: string;
  selectedOptionIds: string[];
  numericValue?: number;
  comment: string;
}

export interface QuestionnaireArtifact {
  id: string;
  kind: "questionnaire";
  title?: string;
  instructions?: string;
  status: ConversationArtifactStatus;
  questions: ConversationQuestionDefinition[];
  answers: ConversationQuestionAnswer[];
  createdAt: Date;
  answeredAt?: Date;
}

export type ConversationArtifact = QuestionnaireArtifact;

export interface ConversationQuestionDefinitionInput {
  id: string;
  label: string;
  type: ConversationQuestionType;
  description?: string;
  options?: ConversationQuestionOption[];
  range?: {
    min: number;
    max: number;
    step?: number;
    unit?: string;
    marks?: ConversationQuestionScaleMark[];
  };
}

export interface ConversationQuestionAnswerInput {
  questionId: string;
  selectedOptionIds?: string[];
  numericValue?: number;
  comment?: string;
}

interface BaseConversationEntry {
  id: ConversationEntryId;
  conversationId: string;
  sequence: number;
  text: string;
  createdAt: Date;
  completedAt: Date;
}

export interface UserTurnEntry extends BaseConversationEntry {
  kind: "user_turn";
}

export interface AssistantTurnEntry extends BaseConversationEntry {
  kind: "assistant_turn";
  status: AssistantTurnStatus;
  error?: string;
  providerMessageRef?: string;
  activities: ConversationActivity[];
  plan?: ConversationPlan;
  artifacts: ConversationArtifact[];
}

export type ConversationEntry = UserTurnEntry | AssistantTurnEntry;

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function assertUniqueIds(values: string[], label: string): void {
  const ids = new Set<string>();

  for (const value of values) {
    if (ids.has(value)) {
      throw new Error(`Duplicate ${label} id: ${value}`);
    }
    ids.add(value);
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStepAligned(value: number, min: number, step: number): boolean {
  const normalized = (value - min) / step;
  return Math.abs(normalized - Math.round(normalized)) < 1e-9;
}

function normalizeScaleRange(
  questionId: string,
  range: ConversationQuestionDefinitionInput["range"],
): ConversationQuestionScaleRange {
  if (!range) {
    throw new Error(`Question "${questionId}" requires a numeric range.`);
  }

  if (!isFiniteNumber(range.min) || !isFiniteNumber(range.max)) {
    throw new Error(`Question "${questionId}" requires finite min and max values.`);
  }

  if (range.max <= range.min) {
    throw new Error(`Question "${questionId}" requires max to be greater than min.`);
  }

  const step = range.step ?? 1;
  if (!isFiniteNumber(step) || step <= 0) {
    throw new Error(`Question "${questionId}" requires a positive step.`);
  }

  const unit = normalizeOptionalText(range.unit);
  const marks = (range.marks ?? []).map((mark) => {
    if (!isFiniteNumber(mark.value)) {
      throw new Error(`Question "${questionId}" has a non-numeric mark value.`);
    }

    if (mark.value < range.min || mark.value > range.max) {
      throw new Error(`Question "${questionId}" has a mark outside its range.`);
    }

    if (!isStepAligned(mark.value, range.min, step)) {
      throw new Error(`Question "${questionId}" has a mark that does not align with its step.`);
    }

    return {
      value: mark.value,
      label: normalizeOptionalText(mark.label),
    };
  });

  const markValues = marks.map((mark) => String(mark.value));
  assertUniqueIds(markValues, `mark for question "${questionId}"`);

  return {
    min: range.min,
    max: range.max,
    step,
    unit,
    marks,
  };
}

function normalizeQuestionDefinition(
  question: ConversationQuestionDefinitionInput,
): ConversationQuestionDefinition {
  const id = question.id.trim();
  const label = question.label.trim();

  if (!id) {
    throw new Error("Each questionnaire question requires an id.");
  }

  if (!label) {
    throw new Error(`Question "${id}" requires a label.`);
  }

  if (
    question.type !== "yes_no" &&
    question.type !== "single_select" &&
    question.type !== "multi_select" &&
    question.type !== "scale"
  ) {
    throw new Error(`Question "${id}" has an unsupported type.`);
  }

  const description = normalizeOptionalText(question.description);

  if (question.type === "yes_no") {
    return {
      id,
      label,
      type: question.type,
      description,
    };
  }

  if (question.type === "scale") {
    return {
      id,
      label,
      type: question.type,
      description,
      range: normalizeScaleRange(id, question.range),
    };
  }

  const options = (question.options ?? []).map((option) => {
    const optionId = option.id.trim();
    const optionLabel = option.label.trim();

    if (!optionId) {
      throw new Error(`Question "${id}" has an option without an id.`);
    }

    if (!optionLabel) {
      throw new Error(`Question "${id}" has an option without a label.`);
    }

    return {
      id: optionId,
      label: optionLabel,
    };
  });

  if (options.length < 2) {
    throw new Error(`Question "${id}" must provide at least two options.`);
  }

  assertUniqueIds(
    options.map((option) => option.id),
    `option for question "${id}"`,
  );

  return {
    id,
    label,
    type: question.type,
    description,
    options,
  };
}

export function getQuestionOptions(
  question: Pick<ConversationQuestionDefinition, "type" | "options">,
): ConversationQuestionOption[] {
  if (question.type === "yes_no") {
    return YES_NO_OPTIONS.map((option) => ({ ...option }));
  }

  return (question.options ?? []).map((option) => ({ ...option }));
}

export function formatQuestionNumericValue(
  question: Pick<ConversationQuestionDefinition, "type" | "range">,
  numericValue: number,
): string {
  if (question.type !== "scale") {
    return String(numericValue);
  }

  const unit = question.range?.unit?.trim();
  return unit ? `${numericValue} ${unit}` : String(numericValue);
}

export function createQuestionnaireArtifact(params: {
  id?: string;
  title?: string;
  instructions?: string;
  questions: ConversationQuestionDefinitionInput[];
}): QuestionnaireArtifact {
  const title = normalizeOptionalText(params.title);
  const instructions = normalizeOptionalText(params.instructions);
  const questions = params.questions.map(normalizeQuestionDefinition);

  if (questions.length === 0) {
    throw new Error("A questionnaire requires at least one question.");
  }

  if (questions.length > 6) {
    throw new Error("A questionnaire cannot contain more than 6 questions.");
  }

  assertUniqueIds(
    questions.map((question) => question.id),
    "question",
  );

  return {
    id: params.id?.trim() || crypto.randomUUID(),
    kind: "questionnaire",
    title,
    instructions,
    status: "pending",
    questions,
    answers: [],
    createdAt: new Date(),
  };
}

export function answerQuestionnaireArtifact(
  artifact: QuestionnaireArtifact,
  answersInput: ConversationQuestionAnswerInput[],
): QuestionnaireArtifact {
  if (artifact.status === "answered") {
    throw new Error("This questionnaire has already been answered.");
  }

  const answersByQuestionId = new Map(
    answersInput.map((answer) => [answer.questionId.trim(), answer] as const),
  );

  assertUniqueIds(
    answersInput.map((answer) => answer.questionId.trim()),
    "question answer",
  );

  const questionIds = new Set(artifact.questions.map((question) => question.id));
  for (const questionId of answersByQuestionId.keys()) {
    if (!questionIds.has(questionId)) {
      throw new Error(`Unknown question answer received: ${questionId}`);
    }
  }

  const answers = artifact.questions.map((question) => {
    const answer = answersByQuestionId.get(question.id);
    if (!answer) {
      throw new Error(`Missing answer for question "${question.label}".`);
    }

    const selectedOptionIds = Array.from(
      new Set((answer.selectedOptionIds ?? []).map((optionId) => optionId.trim()).filter(Boolean)),
    );
    const numericValue = isFiniteNumber(answer.numericValue) ? answer.numericValue : undefined;
    const comment = answer.comment?.trim() ?? "";
    const allowedOptionIds = new Set(getQuestionOptions(question).map((option) => option.id));

    if (question.type === "scale") {
      if (selectedOptionIds.length > 0) {
        throw new Error(`Question "${question.label}" does not accept predefined options.`);
      }

      if (numericValue !== undefined) {
        if (!question.range) {
          throw new Error(`Question "${question.label}" is missing its range configuration.`);
        }

        if (numericValue < question.range.min || numericValue > question.range.max) {
          throw new Error(`Question "${question.label}" received a value outside its range.`);
        }

        if (!isStepAligned(numericValue, question.range.min, question.range.step)) {
          throw new Error(`Question "${question.label}" received a value that does not match its step.`);
        }
      }

      if (numericValue === undefined && comment.length === 0) {
        throw new Error(
          `Question "${question.label}" needs a numeric value or a free-text answer.`,
        );
      }

      return {
        questionId: question.id,
        selectedOptionIds,
        numericValue,
        comment,
      };
    }

    if (numericValue !== undefined) {
      throw new Error(`Question "${question.label}" does not accept numeric values.`);
    }

    if (question.type !== "multi_select" && selectedOptionIds.length > 1) {
      throw new Error(`Question "${question.label}" accepts a single selection.`);
    }

    for (const optionId of selectedOptionIds) {
      if (!allowedOptionIds.has(optionId)) {
        throw new Error(`Question "${question.label}" received an unknown option "${optionId}".`);
      }
    }

    if (selectedOptionIds.length === 0 && comment.length === 0) {
      throw new Error(
        `Question "${question.label}" needs at least one selection or a free-text answer.`,
      );
    }

    return {
      questionId: question.id,
      selectedOptionIds,
      numericValue,
      comment,
    };
  });

  return {
    ...artifact,
    status: "answered",
    answers,
    answeredAt: new Date(),
  };
}

export function createUserTurnEntry(params: {
  conversationId: string;
  sequence: number;
  text: string;
}): UserTurnEntry {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    conversationId: params.conversationId,
    kind: "user_turn",
    sequence: params.sequence,
    text: params.text,
    createdAt: now,
    completedAt: now,
  };
}

export function createAssistantTurnEntry(params: {
  conversationId: string;
  sequence: number;
  text: string;
  status: AssistantTurnStatus;
  error?: string;
  providerMessageRef?: string;
  activities?: ConversationActivity[];
  plan?: ConversationPlan;
  artifacts?: ConversationArtifact[];
}): AssistantTurnEntry {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    conversationId: params.conversationId,
    kind: "assistant_turn",
    sequence: params.sequence,
    text: params.text,
    status: params.status,
    createdAt: now,
    completedAt: now,
    error: params.error,
    providerMessageRef: params.providerMessageRef,
    activities: params.activities ?? [],
    plan: params.plan,
    artifacts: params.artifacts ?? [],
  };
}

export function rehydrateConversationEntry(params:
  | {
      id: ConversationEntryId;
      conversationId: string;
      kind: "user_turn";
      sequence: number;
      text: string;
      createdAt: Date;
      completedAt: Date;
    }
  | {
      id: ConversationEntryId;
      conversationId: string;
      kind: "assistant_turn";
      sequence: number;
      text: string;
      status: AssistantTurnStatus;
      createdAt: Date;
      completedAt: Date;
      error?: string;
      providerMessageRef?: string;
      activities?: ConversationActivity[];
      plan?: ConversationPlan;
      artifacts?: ConversationArtifact[];
    }
): ConversationEntry {
  if (params.kind === "user_turn") {
    return {
      id: params.id,
      conversationId: params.conversationId,
      kind: "user_turn",
      sequence: params.sequence,
      text: params.text,
      createdAt: params.createdAt,
      completedAt: params.completedAt,
    };
  }

  return {
    id: params.id,
    conversationId: params.conversationId,
    kind: "assistant_turn",
    sequence: params.sequence,
    text: params.text,
    status: params.status,
    createdAt: params.createdAt,
    completedAt: params.completedAt,
    error: params.error,
    providerMessageRef: params.providerMessageRef,
    activities: params.activities ?? [],
    plan: params.plan,
    artifacts: params.artifacts ?? [],
  };
}
