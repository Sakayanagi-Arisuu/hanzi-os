import {
  CONTENT_VERSION,
  LESSON_BY_ID,
} from "../data/curriculum";
import { buildExerciseCatalog, type Exercise } from "../lib/exerciseGeneration";
import type { ObjectiveAttemptMethod } from "../learning/attemptProtocol";
import {
  MISTAKE_QUEUE_PROTOCOL_VERSION,
  type MistakeQueueItemV1,
  type MistakeQueueV1,
} from "../mistakes/mistakeProtocol";
import type { Skill } from "../types";
import {
  CURRENT_AUTHORITATIVE_READER_STORIES,
  authoritativeReaderItemByVersion,
} from "./authoritativeReaderItemBank";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import type { D1Database, D1RunResult } from "./d1";
import { readCurrentLearningResetEpoch } from "./learningResetEpoch";

export class MistakeQueueUnavailableError extends Error {
  readonly code = "MISTAKE_QUEUE_UNAVAILABLE";
}

export class MistakeQueueIntegrityError extends Error {
  readonly code = "MISTAKE_QUEUE_INTEGRITY_ERROR";
}

type AttemptRow = {
  activityId: string;
  activityVersion: string;
  source: "lesson" | "reader" | "mistake";
  method: string;
  skill: string;
  outcome: string;
  usedHint: number;
  occurredAt: number;
  receivedAt: number;
};

type EnrollmentRow = {
  enrollmentId: string;
  script: "simplified" | "traditional";
};

type OriginSignal = {
  originSource: "lesson" | "reader";
  activityId: string;
  activityVersion: string;
  method: ObjectiveAttemptMethod;
  skill: Skill;
  occurrenceCount: number;
  latestIncorrectAt: number;
  latestReceivedAt: number;
};

type Presentation = Pick<
  MistakeQueueItemV1,
  | "kind"
  | "instruction"
  | "prompt"
  | "promptMeta"
  | "options"
  | "spokenText"
  | "hint"
>;

const OBJECTIVE_METHODS = new Set<ObjectiveAttemptMethod>([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
]);

const SKILLS = new Set<Skill>([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);

const rows = <T>(result: D1RunResult<T>, label: string) => {
  if (!result.success || !Array.isArray(result.results)) {
    throw new MistakeQueueIntegrityError(`Không thể đọc ${label}.`);
  }
  return result.results;
};

const remediationKey = (activityId: string, activityVersion: string) =>
  `${activityId}\u0000${activityVersion}`;

const stableRandom = (seed: string) => {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.codePointAt(0) ?? 0;
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
};

const hintFor = (method: ObjectiveAttemptMethod) => {
  switch (method) {
    case "meaning-selection":
      return "Nhìn lại loại từ và vai trò của chữ trong ngữ cảnh, rồi loại các nghĩa không cùng trường ý.";
    case "phonology-recognition":
      return "Tách từng âm tiết, xác định vị trí dấu thanh và đối chiếu đường nét của dấu trước khi chọn.";
    case "listening-selection":
      return "Nghe theo từng âm tiết; chú ý phụ âm đầu, vần và hướng chuyển của thanh điệu.";
    case "typed-character-recall":
      return "Gọi lại âm đọc và nghĩa trước, sau đó dựng chữ từ thành phần quen thuộc thay vì đoán hình tổng thể.";
    case "reading-comprehension":
      return "Xác định chủ thể, hành động và từ khóa hỏi; chỉ chọn điều được đoạn văn nói trực tiếp.";
  }
};

const lessonPresentation = (
  signal: OriginSignal,
  script: "simplified" | "traditional",
): Presentation | null => {
  const separator = signal.activityId.indexOf(":");
  if (separator < 1) return null;
  const lessonId = signal.activityId.slice(0, separator);
  const exerciseId = signal.activityId.slice(separator + 1);
  const lesson = LESSON_BY_ID.get(lessonId);
  if (!lesson) return null;
  const exercise: Exercise | undefined = buildExerciseCatalog(
    lesson,
    script,
    stableRandom(signal.activityId),
  ).find((candidate) =>
    candidate.id === exerciseId
    && candidate.activityVersion === signal.activityVersion
  );
  if (!exercise) return null;
  return {
    kind: exercise.kind,
    instruction: exercise.instruction,
    prompt: exercise.prompt,
    ...(exercise.promptMeta ? { promptMeta: exercise.promptMeta } : {}),
    options: [...exercise.options],
    ...(exercise.spokenText ? { spokenText: exercise.spokenText } : {}),
    hint: hintFor(signal.method),
  };
};

const readerItems = authoritativeReaderItemByVersion(
  CURRENT_AUTHORITATIVE_READER_STORIES,
);

const readerPresentation = (signal: OriginSignal): Presentation | null => {
  const binding = readerItems.get(signal.activityVersion);
  if (
    !binding
    || `${binding.story.id}:${binding.item.id}` !== signal.activityId
  ) return null;
  return {
    kind: "reader",
    instruction: "Đọc và truy tìm chi tiết quyết định",
    prompt: binding.item.prompt,
    promptMeta: binding.item.chineseStimulus,
    options: [...binding.item.options],
    spokenText: binding.item.chineseStimulus,
    hint: hintFor("reading-comprehension"),
  };
};

export const deriveRemediationProgress = (
  signal: OriginSignal,
  attempts: readonly AttemptRow[],
) => {
  let repaired = false;
  let lastAttemptAt = signal.latestIncorrectAt;
  for (const attempt of attempts
    .filter((candidate) =>
      candidate.source === "mistake"
      && candidate.activityId === signal.activityId
      && candidate.activityVersion === signal.activityVersion
      && (
        candidate.occurredAt > signal.latestIncorrectAt
        || (
          candidate.occurredAt === signal.latestIncorrectAt
          && candidate.receivedAt > signal.latestReceivedAt
        )
      )
    )
    .sort((left, right) =>
      left.occurredAt - right.occurredAt
      || left.receivedAt - right.receivedAt
  )) {
    lastAttemptAt = Math.max(lastAttemptAt, attempt.occurredAt);
    if (attempt.outcome === "incorrect") repaired = false;
    else if (attempt.usedHint === 0) repaired = true;
  }
  return {
    correctedStreak: repaired ? 1 : 0,
    resolved: repaired,
    lastAttemptAt,
  };
};

export class MistakeQueueRepository {
  constructor(
    private readonly database: D1Database,
    private readonly releasePolicy: ContentReleasePolicy =
      CURRENT_CONTENT_RELEASE_POLICY,
    private readonly now: () => number = Date.now,
  ) {}

  async read(userId: string): Promise<MistakeQueueV1> {
    if (!isPromotedContentReleasePolicy(this.releasePolicy)) {
      throw new MistakeQueueUnavailableError(
        "Nghịch Cảnh Lục chỉ hoạt động với đúng gói nội dung đã mở cho phiên local.",
      );
    }
    const resetEpoch = await readCurrentLearningResetEpoch(
      this.database,
      userId,
    );
    const enrollmentResult = await this.database.prepare(
      `SELECT enrollment.id AS enrollmentId, profile.script AS script
       FROM enrollments enrollment
       INNER JOIN profiles profile ON profile.user_id = enrollment.user_id
       INNER JOIN course_versions course ON course.id = enrollment.course_version_id
       WHERE enrollment.user_id = ? AND enrollment.course_version_id = ?
         AND enrollment.status = 'active'
         AND course.release_state IN ('beta', 'published')
         AND course.linguistic_review_status = 'approved'
       LIMIT 2`,
    ).bind(userId, CONTENT_VERSION).all<EnrollmentRow>();
    const enrollments = rows(enrollmentResult, "enrollment hiện tại");
    if (enrollments.length !== 1) {
      throw new MistakeQueueUnavailableError(
        "Cần đúng một lộ trình đang hoạt động để mở Nghịch Cảnh Lục.",
      );
    }
    const enrollment = enrollments[0]!;
    const attemptResult = await this.database.prepare(
      `SELECT attempt.activity_id AS activityId,
              attempt.activity_version AS activityVersion,
              attempt.source AS source, attempt.method AS method,
              attempt.skill AS skill, attempt.outcome AS outcome,
              attempt.used_hint AS usedHint,
              attempt.occurred_at AS occurredAt,
              attempt.received_at AS receivedAt
       FROM learning_attempts attempt
       WHERE attempt.user_id = ? AND attempt.enrollment_id = ?
         AND attempt.reset_epoch = ? AND attempt.content_version = ?
         AND attempt.source IN ('lesson', 'reader', 'mistake')
         AND EXISTS (
           SELECT 1 FROM learning_evidence evidence
           WHERE evidence.user_id = attempt.user_id
             AND evidence.attempt_id = attempt.id
             AND evidence.reset_epoch = attempt.reset_epoch
             AND evidence.source = attempt.source
             AND evidence.outcome = attempt.outcome
             AND evidence.verified = 1
         )
       ORDER BY attempt.occurred_at ASC, attempt.received_at ASC, attempt.id ASC
       LIMIT 4000`,
    ).bind(
      userId,
      enrollment.enrollmentId,
      resetEpoch,
      CONTENT_VERSION,
    ).all<AttemptRow>();
    const attempts = rows(attemptResult, "lịch sử attempt");
    const signals = new Map<string, OriginSignal>();
    for (const attempt of attempts) {
      if (
        (attempt.source !== "lesson" && attempt.source !== "reader")
        || attempt.outcome !== "incorrect"
        || !OBJECTIVE_METHODS.has(attempt.method as ObjectiveAttemptMethod)
        || !SKILLS.has(attempt.skill as Skill)
      ) continue;
      const key = remediationKey(attempt.activityId, attempt.activityVersion);
      const current = signals.get(key);
      signals.set(key, {
        originSource: attempt.source,
        activityId: attempt.activityId,
        activityVersion: attempt.activityVersion,
        method: attempt.method as ObjectiveAttemptMethod,
        skill: attempt.skill as Skill,
        occurrenceCount: (current?.occurrenceCount ?? 0) + 1,
        latestIncorrectAt: Math.max(
          current?.latestIncorrectAt ?? 0,
          attempt.occurredAt,
        ),
        latestReceivedAt: attempt.occurredAt >= (current?.latestIncorrectAt ?? 0)
          ? attempt.receivedAt
          : current?.latestReceivedAt ?? attempt.receivedAt,
      });
    }

    const items = [...signals.values()].flatMap((signal) => {
      const presentation = signal.originSource === "lesson"
        ? lessonPresentation(signal, enrollment.script)
        : readerPresentation(signal);
      if (!presentation) return [];
      const progress = deriveRemediationProgress(signal, attempts);
      return [{
        remediationId: `${signal.originSource}:${signal.activityId}:${signal.activityVersion}`,
        originSource: signal.originSource,
        activityId: signal.activityId,
        activityVersion: signal.activityVersion,
        method: signal.method,
        skill: signal.skill,
        ...presentation,
        occurrenceCount: signal.occurrenceCount,
        correctedStreak: progress.correctedStreak,
        resolved: progress.resolved,
        lastAttemptAt: new Date(progress.lastAttemptAt).toISOString(),
      } satisfies MistakeQueueItemV1];
    }).sort((left, right) =>
      Number(left.resolved) - Number(right.resolved)
      || right.occurrenceCount - left.occurrenceCount
      || Date.parse(right.lastAttemptAt) - Date.parse(left.lastAttemptAt)
    );
    return {
      protocolVersion: MISTAKE_QUEUE_PROTOCOL_VERSION,
      resetEpoch,
      contentVersion: CONTENT_VERSION,
      generatedAt: new Date(this.now()).toISOString(),
      openCount: items.filter((item) => !item.resolved).length,
      resolvedCount: items.filter((item) => item.resolved).length,
      items,
    };
  }
}
