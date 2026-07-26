import { RELEASED_WORD_BY_ID } from "../data/curriculum";
import type {
  EvidenceMethod,
  EvidenceOutcome,
  EvidenceSource,
  LearningEvidence,
  LearningState,
  Skill,
} from "../types";

const MAX_EVIDENCE = 20_000;
const MAX_ACTIVITY = 2_000;
const MAX_MISTAKES = 2_000;

const skills = new Set<Skill>([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);
const sources = new Set<EvidenceSource>([
  "lesson",
  "reader",
  "writing",
  "pronunciation",
  "mistake",
  "review",
  "diagnostic",
]);
const outcomes = new Set<EvidenceOutcome>([
  "correct",
  "incorrect",
  "completed",
  "unverified",
]);
const methods = new Set<EvidenceMethod>([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
  "stroke-quiz",
  "speech-transcript",
  "remediation-recall",
  "fsrs-rating",
  "diagnostic-selection",
  "lesson-completion",
]);
const answerBearingMetadataKeys = new Set([
  "answer",
  "answerKey",
  "correct",
  "correctAnswer",
  "explanation",
]);

type ImportResult =
  | { ok: true; state: LearningState }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finiteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value);

const validIsoTime = (value: unknown, nullable = false) =>
  (nullable && value === null)
  || (typeof value === "string" && Number.isFinite(Date.parse(value)));

const sanitizeMetadata = (
  value: unknown,
): LearningEvidence["metadata"] => {
  if (!isRecord(value)) return undefined;
  const entries: Array<
    readonly [string, string | number | boolean | null]
  > = [];
  for (const [key, item] of Object.entries(value).slice(0, 32)) {
    if (
      !key
      || key.length > 80
      || answerBearingMetadataKeys.has(key)
    ) continue;
    if (typeof item === "string") {
      entries.push([key, item.slice(0, 600)]);
    } else if (typeof item === "number" && Number.isFinite(item)) {
      entries.push([key, item]);
    } else if (typeof item === "boolean" || item === null) {
      entries.push([key, item]);
    }
  }
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const unwrapExport = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const learning = value.learning;
  if (isRecord(learning) && isRecord(learning.document)) {
    return learning.document.state;
  }
  if (isRecord(value.document)) return value.document.state;
  return value;
};

export function parseLearningStateImport(
  value: unknown,
  defaults: LearningState,
): ImportResult {
  const raw = unwrapExport(value);
  if (!isRecord(raw)) return { ok: false, error: "Bản sao không chứa learning state." };
  if (raw.schemaVersion !== 2) {
    return { ok: false, error: "Phiên bản bản sao chưa được hỗ trợ." };
  }
  if (!isRecord(raw.profile)) return { ok: false, error: "Hồ sơ trong bản sao không hợp lệ." };
  const profile = raw.profile;
  if (
    typeof profile.name !== "string"
    || !["conversation", "hsk", "career", "travel"].includes(String(profile.goal))
    || ![10, 20, 30].includes(Number(profile.dailyMinutes))
    || !["simplified", "traditional"].includes(String(profile.script))
    || !["zero", "basic", "hsk1", "hsk2"].includes(String(profile.startingLevel))
    || typeof profile.onboarded !== "boolean"
  ) {
    return { ok: false, error: "Cấu hình người học trong bản sao không hợp lệ." };
  }
  if (
    !Array.isArray(raw.evidence)
    || raw.evidence.length > MAX_EVIDENCE
    || !Array.isArray(raw.activityLog)
    || raw.activityLog.length > MAX_ACTIVITY
    || !Array.isArray(raw.mistakes)
    || raw.mistakes.length > MAX_MISTAKES
  ) {
    return { ok: false, error: "Bản sao vượt giới hạn hoặc thiếu collection bắt buộc." };
  }
  const idempotencyKeys = new Set<string>();
  for (const evidence of raw.evidence) {
    if (
      !isRecord(evidence)
      || typeof evidence.idempotencyKey !== "string"
      || !evidence.idempotencyKey
      || idempotencyKeys.has(evidence.idempotencyKey)
      || evidence.schemaVersion !== 1
      || typeof evidence.contentVersion !== "string"
      || typeof evidence.activityVersion !== "string"
      || typeof evidence.activityId !== "string"
      || !sources.has(evidence.source as EvidenceSource)
      || !methods.has(evidence.method as EvidenceMethod)
      || !skills.has(evidence.skill as Skill)
      || !outcomes.has(evidence.outcome as EvidenceOutcome)
      || (evidence.score !== null && !finiteNumber(evidence.score))
      || typeof evidence.verified !== "boolean"
      || typeof evidence.masteryEligible !== "boolean"
      || !validIsoTime(evidence.occurredAt)
    ) {
      return { ok: false, error: "Learning evidence trong bản sao bị hỏng hoặc trùng khóa." };
    }
    idempotencyKeys.add(evidence.idempotencyKey);
  }
  for (const event of raw.activityLog) {
    if (
      !isRecord(event)
      || typeof event.id !== "string"
      || !["lesson", "review", "correction", "diagnostic", "practice"].includes(String(event.type))
      || typeof event.label !== "string"
      || !finiteNumber(event.xp)
      || !validIsoTime(event.occurredAt)
    ) {
      return { ok: false, error: "Nhật ký hoạt động trong bản sao không hợp lệ." };
    }
  }

  const savedWords = Array.isArray(raw.savedWords)
    ? [...new Set(raw.savedWords.filter(
        (wordId): wordId is string =>
          typeof wordId === "string" && RELEASED_WORD_BY_ID.has(wordId),
      ))]
    : [];

  const imported: LearningState = {
    ...defaults,
    ...(raw as unknown as Partial<LearningState>),
    schemaVersion: 2,
    profile: { ...defaults.profile, ...profile } as LearningState["profile"],
    savedWords,
    evidence: raw.evidence as LearningState["evidence"],
    activityLog: raw.activityLog as LearningState["activityLog"],
  };
  if (
    !finiteNumber(imported.xp)
    || !finiteNumber(imported.dailyXp)
    || !finiteNumber(imported.streak)
    || !finiteNumber(imported.reviewCount)
    || !validIsoTime(imported.lastStudyDate, true)
  ) {
    return { ok: false, error: "Các bộ đếm trong bản sao không hợp lệ." };
  }

  // A browser-side backup cannot prove server issuance, first exposure, or
  // scoring authority. Preserve structurally valid history for inspection,
  // but never restore its aggregates or mastery-bearing flags. Cloud restore
  // performs its own authoritative replay at the server boundary.
  const inspectableEvidence = imported.evidence.map(
    (item): LearningEvidence => ({
      ...item,
      id: `evidence:${item.idempotencyKey}`,
      outcome: "unverified",
      score: item.method === "speech-transcript" ? item.score : null,
      verified: false,
      masteryEligible: false,
      occurredAt: new Date(item.occurredAt).toISOString(),
      metadata: sanitizeMetadata(item.metadata),
    }),
  );
  const inspectableActivity = imported.activityLog.map((event) => ({
    ...event,
    xp: 0,
    occurredAt: new Date(event.occurredAt).toISOString(),
  }));
  return {
    ok: true,
    state: {
      ...structuredClone(defaults),
      profile: imported.profile,
      savedWords,
      contentVersion: defaults.contentVersion,
      evidence: inspectableEvidence,
      activityLog: inspectableActivity,
    },
  };
}
