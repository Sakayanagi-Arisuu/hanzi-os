import {
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_ENROLLMENT_COURSE_ID,
  CURRENT_ENROLLMENT_PROTOCOL_VERSION,
  type CurrentEnrollmentReceiptV1,
} from "../learning/currentEnrollmentProtocol";
import type { LearningGoal } from "../types";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  promotedCourseReleaseState,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import { ensureCurrentCourseVersion } from "./courseVersionRepository";
import type { D1Database, D1RunResult } from "./d1";
import {
  CURRENT_LEARNING_RESET_EPOCH_SQL,
  readCurrentLearningResetEpoch,
} from "./learningResetEpoch";
import { NORMALIZED_LEARNING_CHANGE_ENTITY } from "./normalizedLearningChange";

const GOALS = new Set<LearningGoal>([
  "conversation",
  "hsk",
  "career",
  "travel",
]);

export class CurrentEnrollmentContentUnavailableError extends Error {
  readonly code = "CURRENT_ENROLLMENT_CONTENT_UNAVAILABLE";

  constructor() {
    super("The exact current content package is not released and reviewed.");
    this.name = "CurrentEnrollmentContentUnavailableError";
  }
}

export class CurrentEnrollmentProfileUnavailableError extends Error {
  readonly code = "CURRENT_ENROLLMENT_PROFILE_UNAVAILABLE";

  constructor() {
    super("A synced, onboarded learner profile is required before enrollment.");
    this.name = "CurrentEnrollmentProfileUnavailableError";
  }
}

export class CurrentEnrollmentIntegrityError extends Error {
  readonly code = "CURRENT_ENROLLMENT_INTEGRITY_ERROR";

  constructor(message = "Unable to establish one exact current enrollment.") {
    super(message);
    this.name = "CurrentEnrollmentIntegrityError";
  }
}

type ProfileRow = {
  goal: string;
  onboarded: number;
};

type ReleasedCourseRow = {
  courseId: string;
  releaseState: string;
};

type ActivatedEnrollmentRow = {
  enrollmentId: string;
  courseId: string;
  contentVersion: string;
  manifestSha256: string;
  releaseState: string;
  goal: string;
};

const allSuccessful = (results: readonly D1RunResult<unknown>[]) =>
  results.every((result) => result.success);

/**
 * Creates or reactivates the one enrollment for the immutable current package.
 * The client cannot choose an enrollment id, course, release state, or goal;
 * all bindings are derived from the released course row and synced profile.
 */
export class CurrentEnrollmentRepository {
  constructor(
    private readonly database: D1Database,
    private readonly releasePolicy: ContentReleasePolicy =
      CURRENT_CONTENT_RELEASE_POLICY,
  ) {}

  async activate(userId: string): Promise<CurrentEnrollmentReceiptV1> {
    if (!userId || userId.length > 160) {
      throw new CurrentEnrollmentIntegrityError("The authenticated user id is invalid.");
    }
    const releaseState = promotedCourseReleaseState(this.releasePolicy);
    if (
      !isPromotedContentReleasePolicy(this.releasePolicy)
      || releaseState === null
    ) {
      throw new CurrentEnrollmentContentUnavailableError();
    }
    await ensureCurrentCourseVersion(this.database, this.releasePolicy);

    const candidateId = crypto.randomUUID();
    const timestamp = Date.now();
    const resetEpoch = await readCurrentLearningResetEpoch(
      this.database,
      userId,
    );
    const exactReleaseGuard = `EXISTS (
      SELECT 1 FROM course_versions course
      WHERE course.id = ?
        AND course.course_id = ?
        AND course.manifest_hash = ?
        AND course.release_state = ?
        AND course.linguistic_review_status = 'approved'
    )`;
    const exactProfileGuard = `EXISTS (
      SELECT 1 FROM profiles profile
      WHERE profile.user_id = ?
        AND profile.onboarded = 1
        AND profile.goal IN ('conversation', 'hsk', 'career', 'travel')
    )`;

    const results = await this.database.batch<ActivatedEnrollmentRow>([
      this.database.prepare(
        `UPDATE enrollments
         SET status = 'active',
             goal = (SELECT goal FROM profiles WHERE user_id = ? LIMIT 1),
             revision = revision + CASE
               WHEN status <> 'active'
                 OR goal <> (SELECT goal FROM profiles WHERE user_id = ? LIMIT 1)
                 THEN 1 ELSE 0 END,
             completed_at = NULL,
             last_activity_at = CASE
               WHEN status <> 'active' THEN ? ELSE last_activity_at END
         WHERE user_id = ?
           AND course_version_id = ?
           AND ${exactReleaseGuard}
           AND ${exactProfileGuard}
           AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`,
      ).bind(
        userId,
        userId,
        timestamp,
        userId,
        CONTENT_VERSION,
        CONTENT_VERSION,
        CURRENT_ENROLLMENT_COURSE_ID,
        CURRENT_CONTENT_MANIFEST_SHA256,
        releaseState,
        userId,
        userId,
        resetEpoch,
      ),
      this.database.prepare(
        `INSERT OR IGNORE INTO enrollments (
           id, user_id, course_version_id, goal, status,
           supersedes_enrollment_id, revision, started_at, last_activity_at
         )
         SELECT ?, profile.user_id, course.id, profile.goal, 'active',
                (
                  SELECT previous.id
                  FROM enrollments previous
                  WHERE previous.user_id = profile.user_id
                    AND previous.course_version_id <> course.id
                    AND previous.status = 'active'
                  ORDER BY previous.last_activity_at DESC, previous.id ASC
                  LIMIT 1
                ),
                1, ?, ?
         FROM profiles profile
         INNER JOIN course_versions course ON course.id = ?
         WHERE profile.user_id = ?
           AND profile.onboarded = 1
           AND profile.goal IN ('conversation', 'hsk', 'career', 'travel')
           AND course.course_id = ?
           AND course.manifest_hash = ?
           AND course.release_state = ?
           AND course.linguistic_review_status = 'approved'
           AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`,
      ).bind(
        candidateId,
        timestamp,
        timestamp,
        CONTENT_VERSION,
        userId,
        CURRENT_ENROLLMENT_COURSE_ID,
        CURRENT_CONTENT_MANIFEST_SHA256,
        releaseState,
        userId,
        resetEpoch,
      ),
      this.database.prepare(
        `UPDATE enrollments
         SET status = 'archived',
             revision = revision + 1,
             completed_at = COALESCE(completed_at, ?)
         WHERE user_id = ?
           AND course_version_id <> ?
           AND status = 'active'
           AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
           AND EXISTS (
             SELECT 1 FROM enrollments current_enrollment
             INNER JOIN course_versions course
               ON course.id = current_enrollment.course_version_id
             WHERE current_enrollment.user_id = ?
               AND current_enrollment.course_version_id = ?
               AND current_enrollment.status = 'active'
               AND course.course_id = ?
               AND course.manifest_hash = ?
               AND course.release_state = ?
               AND course.linguistic_review_status = 'approved'
               AND EXISTS (
                 SELECT 1 FROM profiles profile
                 WHERE profile.user_id = current_enrollment.user_id
                   AND profile.onboarded = 1
                   AND profile.goal = current_enrollment.goal
                   AND profile.goal IN ('conversation', 'hsk', 'career', 'travel')
               )
           )`,
      ).bind(
        timestamp,
        userId,
        CONTENT_VERSION,
        userId,
        resetEpoch,
        userId,
        CONTENT_VERSION,
        CURRENT_ENROLLMENT_COURSE_ID,
        CURRENT_CONTENT_MANIFEST_SHA256,
        releaseState,
      ),
      this.database.prepare(
        `INSERT OR IGNORE INTO sync_changes (
           user_id, reset_epoch, entity_type, entity_id, revision,
           operation_id, operation, payload_json, occurred_at
         )
         SELECT enrollment.user_id, ?, ?, enrollment.id, enrollment.revision,
                'normalized:enrollment-activated:' || enrollment.id || ':'
                  || enrollment.revision,
                'upsert', '{"kind":"current-enrollment"}', ?
         FROM enrollments enrollment
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         INNER JOIN profiles profile
           ON profile.user_id = enrollment.user_id
          AND profile.onboarded = 1
          AND profile.goal = enrollment.goal
         WHERE enrollment.user_id = ?
           AND enrollment.course_version_id = ?
           AND enrollment.status = 'active'
           AND course.course_id = ?
           AND course.manifest_hash = ?
           AND course.release_state = ?
           AND course.linguistic_review_status = 'approved'
           AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`,
      ).bind(
        resetEpoch,
        NORMALIZED_LEARNING_CHANGE_ENTITY.enrollment,
        timestamp,
        userId,
        CONTENT_VERSION,
        CURRENT_ENROLLMENT_COURSE_ID,
        CURRENT_CONTENT_MANIFEST_SHA256,
        releaseState,
        userId,
        resetEpoch,
      ),
      this.database.prepare(
        `SELECT enrollment.id AS enrollmentId,
                course.course_id AS courseId,
                enrollment.course_version_id AS contentVersion,
                course.manifest_hash AS manifestSha256,
                course.release_state AS releaseState,
                enrollment.goal AS goal
         FROM enrollments enrollment
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         INNER JOIN profiles profile
           ON profile.user_id = enrollment.user_id
          AND profile.onboarded = 1
          AND profile.goal = enrollment.goal
         WHERE enrollment.user_id = ?
           AND enrollment.course_version_id = ?
           AND enrollment.status = 'active'
           AND enrollment.goal IN ('conversation', 'hsk', 'career', 'travel')
           AND course.course_id = ?
           AND course.manifest_hash = ?
           AND course.release_state = ?
           AND course.linguistic_review_status = 'approved'
           AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
           AND NOT EXISTS (
             SELECT 1 FROM enrollments other
             WHERE other.user_id = enrollment.user_id
               AND other.status = 'active'
               AND other.id <> enrollment.id
           )
         LIMIT 2`,
      ).bind(
        userId,
        CONTENT_VERSION,
        CURRENT_ENROLLMENT_COURSE_ID,
        CURRENT_CONTENT_MANIFEST_SHA256,
        releaseState,
        userId,
        resetEpoch,
      ),
    ]);
    if (results.length !== 5 || !allSuccessful(results)) {
      throw new CurrentEnrollmentIntegrityError(
        "The atomic enrollment transition did not complete.",
      );
    }
    const rows = results[4]?.results ?? [];
    if (rows.length !== 1) {
      const [course, profile] = await Promise.all([
        this.database.prepare(
          `SELECT course_id AS courseId, release_state AS releaseState
           FROM course_versions
           WHERE id = ?
             AND course_id = ?
             AND manifest_hash = ?
             AND release_state = ?
             AND linguistic_review_status = 'approved'
           LIMIT 1`,
        ).bind(
          CONTENT_VERSION,
          CURRENT_ENROLLMENT_COURSE_ID,
          CURRENT_CONTENT_MANIFEST_SHA256,
          releaseState,
        ).first<ReleasedCourseRow>(),
        this.database.prepare(
          `SELECT goal, onboarded
           FROM profiles
           WHERE user_id = ?
           LIMIT 1`,
        ).bind(userId).first<ProfileRow>(),
      ]);
      if (!course) throw new CurrentEnrollmentContentUnavailableError();
      if (
        !profile
        || profile.onboarded !== 1
        || !GOALS.has(profile.goal as LearningGoal)
      ) {
        throw new CurrentEnrollmentProfileUnavailableError();
      }
      throw new CurrentEnrollmentIntegrityError();
    }
    const enrollment = rows[0];
    if (
      !enrollment.enrollmentId
      || enrollment.enrollmentId.length > 160
      || enrollment.courseId !== CURRENT_ENROLLMENT_COURSE_ID
      || enrollment.contentVersion !== CONTENT_VERSION
      || enrollment.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
      || enrollment.releaseState !== releaseState
      || !GOALS.has(enrollment.goal as LearningGoal)
    ) throw new CurrentEnrollmentIntegrityError();

    return {
      protocolVersion: CURRENT_ENROLLMENT_PROTOCOL_VERSION,
      enrollmentId: enrollment.enrollmentId,
      courseId: CURRENT_ENROLLMENT_COURSE_ID,
      contentVersion: enrollment.contentVersion,
      manifestSha256: enrollment.manifestSha256,
      releaseState,
      goal: enrollment.goal as LearningGoal,
    };
  }
}
