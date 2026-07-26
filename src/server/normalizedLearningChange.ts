export const NORMALIZED_LEARNING_CHANGE_ENTITY = {
  enrollment: "enrollment",
  lessonSession: "lesson_session",
  learningAttempt: "learning_attempt",
  assessmentSession: "assessment_session",
  assessmentAttempt: "assessment_attempt",
  readerSession: "reader_session",
  fsrsCard: "fsrs_card",
  reviewLog: "review_log",
} as const;

export const NORMALIZED_LEARNING_CHANGE_ENTITIES = [
  NORMALIZED_LEARNING_CHANGE_ENTITY.enrollment,
  NORMALIZED_LEARNING_CHANGE_ENTITY.lessonSession,
  NORMALIZED_LEARNING_CHANGE_ENTITY.learningAttempt,
  NORMALIZED_LEARNING_CHANGE_ENTITY.assessmentSession,
  NORMALIZED_LEARNING_CHANGE_ENTITY.assessmentAttempt,
  NORMALIZED_LEARNING_CHANGE_ENTITY.readerSession,
  NORMALIZED_LEARNING_CHANGE_ENTITY.fsrsCard,
  NORMALIZED_LEARNING_CHANGE_ENTITY.reviewLog,
] as const;

export const normalizedLearningChangeOperationId = {
  currentEnrollmentActivated: (enrollmentId: string, revision: number) =>
    `normalized:enrollment-activated:${enrollmentId}:${revision}`,
  lessonSessionOpened: (idempotencyKey: string) =>
    `normalized:lesson-session-open:${idempotencyKey}`,
  learningAttemptRecorded: (idempotencyKey: string) =>
    `normalized:learning-attempt:${idempotencyKey}`,
  lessonSessionSubmitted: (idempotencyKey: string) =>
    `normalized:lesson-session-submit:${idempotencyKey}`,
  lessonSessionAbandoned: (idempotencyKey: string) =>
    `normalized:lesson-session-abandon:${idempotencyKey}`,
  assessmentSessionOpened: (idempotencyKey: string) =>
    `normalized:assessment-session-open:${idempotencyKey}`,
  assessmentAttemptRecorded: (idempotencyKey: string) =>
    `normalized:assessment-attempt:${idempotencyKey}`,
  assessmentSessionSubmitted: (idempotencyKey: string) =>
    `normalized:assessment-session-submit:${idempotencyKey}`,
  assessmentSessionAbandoned: (idempotencyKey: string) =>
    `normalized:assessment-session-abandon:${idempotencyKey}`,
  readerSessionOpened: (idempotencyKey: string) =>
    `normalized:reader-session-open:${idempotencyKey}`,
  readerAttemptRecorded: (idempotencyKey: string) =>
    `normalized:reader-attempt:${idempotencyKey}`,
  readerSessionSubmitted: (idempotencyKey: string) =>
    `normalized:reader-session-submit:${idempotencyKey}`,
  readerSessionAbandoned: (idempotencyKey: string) =>
    `normalized:reader-session-abandon:${idempotencyKey}`,
  reviewCardGraded: (idempotencyKey: string) =>
    `normalized:review-card-grade:${idempotencyKey}`,
  reviewLogRecorded: (idempotencyKey: string) =>
    `normalized:review-log:${idempotencyKey}`,
} as const;
