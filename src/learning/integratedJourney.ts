import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import type { LearningGoal } from "../types";
import type { LearningJourneyStage } from "./learningJourney";

export const INTEGRATED_JOURNEY_SCHEMA_VERSION = 1 as const;
export const INTEGRATED_JOURNEY_STORAGE_PREFIX =
  "hanzi-os-integrated-journey-v1";

export type LearningJourneyReceiptSource =
  | "lesson"
  | "review"
  | "mistakes"
  | "pronunciation"
  | "reader"
  | "writing"
  | "dictionary"
  | "assessment"
  | "path";

export type LearningJourneyReceipt = {
  stage: LearningJourneyStage;
  source: LearningJourneyReceiptSource;
  lessonId?: string | null;
  activityId: string;
  occurredAt?: string;
};

export type IntegratedJourneyCheckpoint = {
  schemaVersion: typeof INTEGRATED_JOURNEY_SCHEMA_VERSION;
  contentVersion: string;
  scopeKey: string;
  journeyId: string;
  goal: LearningGoal;
  anchorLessonId: string | null;
  completedStages: Partial<Record<LearningJourneyStage, string>>;
  receiptIds: string[];
  createdAt: string;
  updatedAt: string;
};

const stageSources: Readonly<
  Record<LearningJourneyStage, readonly LearningJourneyReceiptSource[]>
> = {
  learn: ["lesson"],
  review: ["review", "mistakes"],
  transfer: [
    "pronunciation",
    "reader",
    "writing",
    "dictionary",
    "assessment",
  ],
  close: ["path"],
};

const validLessonIds = new Set(RELEASED_LESSONS.map((lesson) => lesson.id));

type AuthoritativeJourneyProgress = {
  nextLesson?: { lessonId: string } | null;
  lessons: readonly {
    lessonId: string;
    unlocked: boolean;
    passed: boolean;
  }[];
};

/** Uses only server-authoritative unlock state when an account is active. */
export const selectAuthoritativeJourneyAnchor = (
  progress: AuthoritativeJourneyProgress | null,
) => {
  const lessonId = progress?.nextLesson?.lessonId
    ?? progress?.lessons.find((lesson) => lesson.unlocked && !lesson.passed)?.lessonId
    ?? null;
  return lessonId && validLessonIds.has(lessonId) ? lessonId : null;
};

export const integratedJourneyStorageKey = (scopeKey: string) =>
  `${INTEGRATED_JOURNEY_STORAGE_PREFIX}:${encodeURIComponent(scopeKey)}`;

export const createIntegratedJourneyCheckpoint = (input: {
  scopeKey: string;
  goal: LearningGoal;
  anchorLessonId: string | null;
  now?: string;
}): IntegratedJourneyCheckpoint => {
  const now = input.now ?? new Date().toISOString();
  return {
    schemaVersion: INTEGRATED_JOURNEY_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    scopeKey: input.scopeKey,
    journeyId: [
      "journey",
      input.goal,
      input.anchorLessonId ?? "path",
      now,
    ].join(":"),
    goal: input.goal,
    anchorLessonId: input.anchorLessonId,
    completedStages: {},
    receiptIds: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const parseIntegratedJourneyCheckpoint = (
  value: unknown,
  expectedScopeKey: string,
): IntegratedJourneyCheckpoint | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Partial<IntegratedJourneyCheckpoint>;
  if (
    item.schemaVersion !== INTEGRATED_JOURNEY_SCHEMA_VERSION
    || item.contentVersion !== CONTENT_VERSION
    || item.scopeKey !== expectedScopeKey
    || typeof item.journeyId !== "string"
    || typeof item.goal !== "string"
    || !["conversation", "travel", "hsk", "career"].includes(item.goal)
    || (item.anchorLessonId !== null
      && (typeof item.anchorLessonId !== "string"
        || !validLessonIds.has(item.anchorLessonId)))
    || !item.completedStages
    || typeof item.completedStages !== "object"
    || !Array.isArray(item.receiptIds)
    || typeof item.createdAt !== "string"
    || typeof item.updatedAt !== "string"
  ) return null;
  return {
    ...item,
    goal: item.goal as LearningGoal,
    completedStages: Object.fromEntries(
      Object.entries(item.completedStages).filter(([stage, timestamp]) =>
        ["learn", "review", "transfer", "close"].includes(stage)
        && typeof timestamp === "string"
      ),
    ),
    receiptIds: item.receiptIds.filter((id): id is string => typeof id === "string")
      .slice(-64),
  } as IntegratedJourneyCheckpoint;
};

export type ApplyJourneyReceiptResult =
  | { state: "accepted"; checkpoint: IntegratedJourneyCheckpoint }
  | { state: "duplicate"; checkpoint: IntegratedJourneyCheckpoint }
  | { state: "rejected"; checkpoint: IntegratedJourneyCheckpoint };

export const applyLearningJourneyReceipt = (
  checkpoint: IntegratedJourneyCheckpoint,
  receipt: LearningJourneyReceipt,
): ApplyJourneyReceiptResult => {
  if (checkpoint.receiptIds.includes(receipt.activityId)) {
    return { state: "duplicate", checkpoint };
  }
  if (!stageSources[receipt.stage].includes(receipt.source)) {
    return { state: "rejected", checkpoint };
  }
  const requiredPreviousStages: Readonly<
    Record<LearningJourneyStage, readonly LearningJourneyStage[]>
  > = {
    learn: [],
    review: ["learn"],
    transfer: ["learn", "review"],
    close: ["learn", "review", "transfer"],
  };
  if (requiredPreviousStages[receipt.stage].some(
    (stage) => !checkpoint.completedStages[stage],
  )) return { state: "rejected", checkpoint };
  if (
    checkpoint.anchorLessonId
    && receipt.lessonId
    && receipt.lessonId !== checkpoint.anchorLessonId
  ) return { state: "rejected", checkpoint };

  const occurredAt = receipt.occurredAt ?? new Date().toISOString();
  return {
    state: "accepted",
    checkpoint: {
      ...checkpoint,
      completedStages: {
        ...checkpoint.completedStages,
        [receipt.stage]: occurredAt,
      },
      receiptIds: [...checkpoint.receiptIds, receipt.activityId].slice(-64),
      updatedAt: occurredAt,
    },
  };
};
