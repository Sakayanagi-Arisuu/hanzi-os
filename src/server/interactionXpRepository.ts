import { CONTENT_VERSION, LESSON_BY_ID } from "../data/curriculum";
import {
  LESSON_REWARD_CLAIM_STARTED_AT,
  REVIEW_INTERACTION_XP,
} from "../learning/interactionXp";
import { PRONUNCIATION_QUEST_XP } from "../learning/pronunciationPractice";
import type { D1Database, D1RunResult } from "./d1";
import {
  CURRENT_LEARNING_RESET_EPOCH_SQL,
  readCurrentLearningResetEpoch,
} from "./learningResetEpoch";

export const PRONUNCIATION_REWARD_SCOPE =
  "pronunciation-interaction-reward-v1" as const;
export const PRONUNCIATION_REWARD_RULE = "pronunciation-daily-v1" as const;
export const LESSON_REWARD_SCOPE = "lesson-interaction-reward-v1" as const;
export const LESSON_REWARD_RULE = "lesson-chest-v1" as const;
// Compatibility boundary: passes recorded before the interactive chest shipped
// already granted EXP. They stay claimed without rewriting learner history.
export type AccountLessonReward = {
  lessonId: string;
  amount: number;
  status: "pending" | "claimed";
};

export type AccountInteractionXpProjection = {
  protocolVersion: 2;
  resetEpoch: number;
  totalXp: number;
  dailyXp: number;
  rewardedLessonCount: number;
  rewardedReviewCount: number;
  pronunciationRewardCount: number;
  lessonRewards: AccountLessonReward[];
};

type LessonRewardRow = {
  lessonId: string;
  lessonVersion: string;
  firstPassedAt: number;
  claimedAt: number | null;
};

type CountRow = { count: number };
type SumRow = { total: number | null; count: number };

const resultRows = <T>(result: D1RunResult<T>): T[] => {
  if (!result.success || !Array.isArray(result.results)) {
    throw new Error("Interaction XP query failed.");
  }
  return result.results;
};

const safeCount = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const validDayWindow = (start: number, end: number) =>
  Number.isSafeInteger(start)
  && Number.isSafeInteger(end)
  && start >= 0
  && end > start
  && end - start >= 20 * 60 * 60 * 1_000
  && end - start <= 28 * 60 * 60 * 1_000;

const pronunciationRewardDay = (rewardKey: string) => {
  const escapedContentVersion = CONTENT_VERSION.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(
    `^pronunciation-daily:${escapedContentVersion}:(\\d{4}-\\d{2}-\\d{2})$`,
    "u",
  ).exec(rewardKey);
  if (!match?.[1]) return null;
  const timestamp = Date.parse(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const lessonRewardSourceId = (resetEpoch: number, lessonId: string) =>
  `lesson-reward:${resetEpoch}:${CONTENT_VERSION}:${lessonId}`;

export class InteractionXpRepository {
  constructor(
    private readonly database: D1Database,
    private readonly now: () => number = Date.now,
  ) {}

  async read(
    userId: string,
    dayStart: number,
    dayEnd: number,
  ): Promise<AccountInteractionXpProjection> {
    if (!validDayWindow(dayStart, dayEnd)) {
      throw new Error("Interaction XP day window is invalid.");
    }
    const resetEpoch = await readCurrentLearningResetEpoch(this.database, userId);
    const [lessonResult, reviewTotalResult, reviewDailyResult, ledgerTotalResult, ledgerDailyResult] =
      await this.database.batch([
        this.database.prepare(
          `SELECT first_pass.lessonId,
                  first_pass.lessonVersion,
                  first_pass.firstPassedAt,
                  reward.occurred_at AS claimedAt
           FROM (
             SELECT session.lesson_id AS lessonId,
                    session.lesson_version AS lessonVersion,
                    MIN(session.submitted_at) AS firstPassedAt
             FROM lesson_sessions session
             INNER JOIN enrollments enrollment
               ON enrollment.user_id = session.user_id
              AND enrollment.id = session.enrollment_id
             WHERE session.user_id = ?
               AND session.reset_epoch = ?
               AND session.content_version = ?
               AND session.status = 'submitted'
               AND session.passed = 1
               AND enrollment.status = 'active'
               AND enrollment.course_version_id = ?
             GROUP BY session.lesson_id, session.lesson_version
           ) first_pass
           LEFT JOIN xp_ledger reward
             ON reward.user_id = ?
            AND reward.reset_epoch = ?
            AND reward.source_type = 'lesson-reward'
            AND reward.source_id = ? || first_pass.lessonId
            AND reward.rule_version = ?
           ORDER BY first_pass.lessonId ASC`,
        ).bind(
          userId,
          resetEpoch,
          CONTENT_VERSION,
          CONTENT_VERSION,
          userId,
          resetEpoch,
          lessonRewardSourceId(resetEpoch, ""),
          LESSON_REWARD_RULE,
        ),
        this.database.prepare(
          `SELECT COUNT(*) AS count
           FROM review_logs log
           INNER JOIN fsrs_cards card
             ON card.user_id = log.user_id AND card.id = log.card_id
           WHERE log.user_id = ? AND log.reset_epoch = ?
             AND card.content_version = ?`,
        ).bind(userId, resetEpoch, CONTENT_VERSION),
        this.database.prepare(
          `SELECT COUNT(*) AS count
           FROM review_logs log
           INNER JOIN fsrs_cards card
             ON card.user_id = log.user_id AND card.id = log.card_id
           WHERE log.user_id = ? AND log.reset_epoch = ?
             AND card.content_version = ?
             AND log.reviewed_at >= ? AND log.reviewed_at < ?`,
        ).bind(userId, resetEpoch, CONTENT_VERSION, dayStart, dayEnd),
        this.database.prepare(
          `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
           FROM xp_ledger
           WHERE user_id = ? AND reset_epoch = ?
             AND source_type = 'pronunciation-daily'
             AND rule_version = ? AND amount = ?`,
        ).bind(
          userId,
          resetEpoch,
          PRONUNCIATION_REWARD_RULE,
          PRONUNCIATION_QUEST_XP,
        ),
        this.database.prepare(
          `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
           FROM xp_ledger
           WHERE user_id = ? AND reset_epoch = ?
             AND source_type = 'pronunciation-daily'
             AND rule_version = ? AND amount = ?
             AND occurred_at >= ? AND occurred_at < ?`,
        ).bind(
          userId,
          resetEpoch,
          PRONUNCIATION_REWARD_RULE,
          PRONUNCIATION_QUEST_XP,
          dayStart,
          dayEnd,
        ),
      ]);

    const lessonRows = resultRows(lessonResult) as LessonRewardRow[];
    const reviewTotal = (resultRows(reviewTotalResult) as CountRow[])[0]?.count;
    const reviewDaily = (resultRows(reviewDailyResult) as CountRow[])[0]?.count;
    const ledgerTotal = (resultRows(ledgerTotalResult) as SumRow[])[0];
    const ledgerDaily = (resultRows(ledgerDailyResult) as SumRow[])[0];
    if (
      !safeCount(reviewTotal)
      || !safeCount(reviewDaily)
      || !safeCount(ledgerTotal?.total)
      || !safeCount(ledgerTotal?.count)
      || !safeCount(ledgerDaily?.total)
      || !safeCount(ledgerDaily?.count)
    ) throw new Error("Interaction XP aggregate is invalid.");

    let lessonXp = 0;
    let dailyLessonXp = 0;
    const lessonRewards: AccountLessonReward[] = [];
    for (const row of lessonRows) {
      const lesson = LESSON_BY_ID.get(row.lessonId);
      if (
        !lesson
        || row.lessonVersion !== `${CONTENT_VERSION}:${lesson.id}:1`
        || !Number.isSafeInteger(row.firstPassedAt)
      ) throw new Error("Interaction XP lesson reward is invalid.");
      const legacyClaimed = row.firstPassedAt < LESSON_REWARD_CLAIM_STARTED_AT;
      const claimed = legacyClaimed || Number.isSafeInteger(row.claimedAt);
      lessonRewards.push({
        lessonId: lesson.id,
        amount: lesson.xp,
        status: claimed ? "claimed" : "pending",
      });
      if (!claimed) continue;
      lessonXp += lesson.xp;
      const rewardedAt = legacyClaimed ? row.firstPassedAt : Number(row.claimedAt);
      if (rewardedAt >= dayStart && rewardedAt < dayEnd) {
        dailyLessonXp += lesson.xp;
      }
    }

    const totalXp = lessonXp
      + reviewTotal * REVIEW_INTERACTION_XP
      + Number(ledgerTotal!.total);
    const dailyXp = dailyLessonXp
      + reviewDaily * REVIEW_INTERACTION_XP
      + Number(ledgerDaily!.total);
    if (!safeCount(totalXp) || !safeCount(dailyXp)) {
      throw new Error("Interaction XP total exceeds its safe range.");
    }
    return {
      protocolVersion: 2,
      resetEpoch,
      totalXp,
      dailyXp,
      rewardedLessonCount: lessonRewards.filter((reward) => reward.status === "claimed").length,
      rewardedReviewCount: reviewTotal,
      pronunciationRewardCount: ledgerTotal!.count,
      lessonRewards,
    };
  }

  async claimLessonReward(
    userId: string,
    lessonId: string,
    expectedResetEpoch: number,
  ) {
    const lesson = LESSON_BY_ID.get(lessonId);
    if (!lesson) throw new Error("Lesson reward is not in the released catalog.");
    const resetEpoch = await readCurrentLearningResetEpoch(this.database, userId);
    if (resetEpoch !== expectedResetEpoch) {
      throw new Error("Lesson reward belongs to a stale reset epoch.");
    }
    const firstPass = await this.database.prepare(
      `SELECT MIN(session.submitted_at) AS firstPassedAt,
              session.enrollment_id AS enrollmentId
       FROM lesson_sessions session
       INNER JOIN enrollments enrollment
         ON enrollment.user_id = session.user_id
        AND enrollment.id = session.enrollment_id
       WHERE session.user_id = ? AND session.reset_epoch = ?
         AND session.content_version = ? AND session.lesson_id = ?
         AND session.lesson_version = ? AND session.status = 'submitted'
         AND session.passed = 1 AND enrollment.status = 'active'
         AND enrollment.course_version_id = ?
       GROUP BY session.enrollment_id
       ORDER BY firstPassedAt ASC LIMIT 1`,
    ).bind(
      userId,
      resetEpoch,
      CONTENT_VERSION,
      lesson.id,
      `${CONTENT_VERSION}:${lesson.id}:1`,
      CONTENT_VERSION,
    ).first<{ firstPassedAt: number; enrollmentId: string }>();
    if (!firstPass || !Number.isSafeInteger(firstPass.firstPassedAt)) {
      throw new Error("Lesson has no eligible first clear.");
    }
    if (firstPass.firstPassedAt < LESSON_REWARD_CLAIM_STARTED_AT) {
      return { awarded: false, amount: 0, resetEpoch, status: "claimed" } as const;
    }

    const sourceId = lessonRewardSourceId(resetEpoch, lesson.id);
    const existing = await this.database.prepare(
      `SELECT id FROM xp_ledger
       WHERE user_id = ? AND reset_epoch = ? AND source_type = 'lesson-reward'
         AND source_id = ? AND rule_version = ? LIMIT 1`,
    ).bind(userId, resetEpoch, sourceId, LESSON_REWARD_RULE).first<{ id: string }>();
    if (existing) {
      return { awarded: false, amount: 0, resetEpoch, status: "claimed" } as const;
    }

    const now = Math.floor(this.now());
    const idempotencyId = crypto.randomUUID();
    const ledgerId = crypto.randomUUID();
    const idempotencyKey = `${sourceId}:${LESSON_REWARD_RULE}`;
    const results = await this.database.batch([
      this.database.prepare(
        `INSERT INTO idempotency_records (
           id, user_id, reset_epoch, scope, idempotency_key, request_hash,
           status, response_status, response_json, created_at, updated_at,
           completed_at
         )
         SELECT ?, ?, ?, ?, ?, ?, 'completed', 201, NULL, ?, ?, ?
         WHERE ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         ON CONFLICT (user_id, scope, idempotency_key) DO NOTHING`,
      ).bind(
        idempotencyId,
        userId,
        resetEpoch,
        LESSON_REWARD_SCOPE,
        idempotencyKey,
        idempotencyKey,
        now,
        now,
        now,
        userId,
        resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO xp_ledger (
           id, user_id, enrollment_id, idempotency_record_id, reset_epoch,
           source_type, source_id, rule_version, amount, metadata_json,
           occurred_at, created_at
         )
         SELECT ?, ?, ?, record.id, ?, 'lesson-reward', ?, ?, ?, ?, ?, ?
         FROM idempotency_records record
         WHERE record.id = ? AND record.user_id = ? AND record.reset_epoch = ?
           AND record.scope = ?
         ON CONFLICT (user_id, source_type, source_id, rule_version) DO NOTHING`,
      ).bind(
        ledgerId,
        userId,
        firstPass.enrollmentId,
        resetEpoch,
        sourceId,
        LESSON_REWARD_RULE,
        lesson.xp,
        JSON.stringify({ lessonId: lesson.id, contentVersion: CONTENT_VERSION }),
        now,
        now,
        idempotencyId,
        userId,
        resetEpoch,
        LESSON_REWARD_SCOPE,
      ),
    ]);
    const awarded = results[1]?.success && results[1].meta?.changes === 1;
    return {
      awarded: Boolean(awarded),
      amount: awarded ? lesson.xp : 0,
      resetEpoch,
      status: "claimed",
    } as const;
  }

  async claimPronunciationReward(
    userId: string,
    rewardKey: string,
    expectedResetEpoch: number,
  ) {
    const rewardDay = pronunciationRewardDay(rewardKey);
    const now = Math.floor(this.now());
    const currentUtcDay = Date.parse(new Date(now).toISOString().slice(0, 10));
    if (
      rewardDay === null
      || Math.abs(rewardDay - currentUtcDay) > 24 * 60 * 60 * 1_000
    ) throw new Error("Pronunciation reward key is outside the allowed day.");

    const resetEpoch = await readCurrentLearningResetEpoch(this.database, userId);
    if (resetEpoch !== expectedResetEpoch) {
      throw new Error("Pronunciation reward belongs to a stale reset epoch.");
    }
    const existing = await this.database.prepare(
      `SELECT id FROM xp_ledger
       WHERE user_id = ? AND reset_epoch = ?
         AND source_type = 'pronunciation-daily'
         AND source_id = ? AND rule_version = ?
       LIMIT 1`,
    ).bind(
      userId,
      resetEpoch,
      rewardKey,
      PRONUNCIATION_REWARD_RULE,
    ).first<{ id: string }>();
    if (existing) return { awarded: false, amount: 0, resetEpoch } as const;

    const enrollment = await this.database.prepare(
      `SELECT id FROM enrollments
       WHERE user_id = ? AND course_version_id = ? AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
    ).bind(userId, CONTENT_VERSION).first<{ id: string }>();
    if (!enrollment) throw new Error("No active enrollment can receive EXP.");

    const idempotencyId = crypto.randomUUID();
    const ledgerId = crypto.randomUUID();
    const results = await this.database.batch([
      this.database.prepare(
        `INSERT INTO idempotency_records (
           id, user_id, reset_epoch, scope, idempotency_key, request_hash,
           status, response_status, response_json, created_at, updated_at,
           completed_at
         )
         SELECT ?, ?, ?, ?, ?, ?, 'completed', 201, NULL, ?, ?, ?
         WHERE ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         ON CONFLICT (user_id, scope, idempotency_key) DO NOTHING`,
      ).bind(
        idempotencyId,
        userId,
        resetEpoch,
        PRONUNCIATION_REWARD_SCOPE,
        rewardKey,
        rewardKey,
        now,
        now,
        now,
        userId,
        resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO xp_ledger (
           id, user_id, enrollment_id, idempotency_record_id, reset_epoch,
           source_type, source_id, rule_version, amount, metadata_json,
           occurred_at, created_at
         )
         SELECT ?, ?, ?, record.id, ?, 'pronunciation-daily', ?, ?, ?, '{}', ?, ?
         FROM idempotency_records record
         WHERE record.id = ? AND record.user_id = ?
           AND record.reset_epoch = ? AND record.scope = ?
         ON CONFLICT (user_id, source_type, source_id, rule_version) DO NOTHING`,
      ).bind(
        ledgerId,
        userId,
        enrollment.id,
        resetEpoch,
        rewardKey,
        PRONUNCIATION_REWARD_RULE,
        PRONUNCIATION_QUEST_XP,
        now,
        now,
        idempotencyId,
        userId,
        resetEpoch,
        PRONUNCIATION_REWARD_SCOPE,
      ),
    ]);
    const awarded = results[1]?.success && results[1].meta?.changes === 1;
    return {
      awarded: Boolean(awarded),
      amount: awarded ? PRONUNCIATION_QUEST_XP : 0,
      resetEpoch,
    } as const;
  }
}
