import { describe, expect, it } from "vitest";
import {
  decodeOutboxEvent,
  encodeOutboxEventPayload,
  OUTBOX_EVENT_TYPES,
  sanitizeOutboxJson,
  type OutboxEventTypeV1,
  type StoredOutboxEvent,
} from "./outboxEventContract";

const MANIFEST_HASH = `sha256:${"a".repeat(64)}`;
const FORM_HASH = `sha256:${"b".repeat(64)}`;

const eventPayloads: Record<OutboxEventTypeV1, Record<string, unknown>> = {
  "lesson.started": {
    sessionId: "lesson-session",
    enrollmentId: "enrollment",
    contentVersion: "foundation-2026.07.3",
    resetEpoch: 2,
    contentManifestSha256: MANIFEST_HASH,
    lessonId: "lesson-1",
    lessonVersion: "lesson-1-v1",
    expectedEvidenceCount: 3,
    formSchemaVersion: 1,
    formHash: FORM_HASH,
    startedAt: "2026-07-25T00:00:00.000Z",
  },
  "lesson.completed": {
    sessionId: "lesson-session",
    completionEvidenceId: "completion-evidence",
    contentVersion: "foundation-2026.07.3",
    resetEpoch: 2,
    contentManifestSha256: MANIFEST_HASH,
    lessonId: "lesson-1",
    lessonVersion: "lesson-1-v1",
    formHash: FORM_HASH,
    evidenceCount: 3,
    rawScore: 100,
    gateScore: 100,
    requiredEvidenceCount: 2,
    requiredCorrectCount: 2,
    passed: true,
    submittedAt: "2026-07-25T00:01:00.000Z",
  },
  "lesson.abandoned": {
    sessionId: "lesson-session",
    enrollmentId: "enrollment",
    contentVersion: "foundation-2026.07.3",
    resetEpoch: 2,
    contentManifestSha256: MANIFEST_HASH,
    lessonId: "lesson-1",
    lessonVersion: "lesson-1-v1",
    abandonedAt: "2026-07-25T00:01:00.000Z",
  },
  "learning.attempt.recorded": {
    attemptId: "learning-attempt",
    evidenceId: "learning-evidence",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    contentManifestSha256: MANIFEST_HASH,
    source: "reader",
    method: "reading-comprehension",
    activityId: "reader-item",
    activityVersion: "reader-item-v1",
    skill: "reading",
    outcome: "correct",
    score: 100,
    verification: "server-objective",
    masteryEligible: false,
  },
  "assessment.started": {
    sessionId: "assessment-session",
    enrollmentId: "enrollment",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    contentManifestSha256: MANIFEST_HASH,
    blueprintId: "foundation-screening",
    formVersion: "form-v1",
    scoringPolicyVersion: "assessment-scoring-v1",
    expectedItemCount: 8,
    formHash: FORM_HASH,
    startedAt: "2026-07-25T00:00:00.000Z",
  },
  "assessment.attempt.recorded": {
    attemptId: "assessment-attempt",
    sessionId: "assessment-session",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    formHash: FORM_HASH,
    position: 0,
    itemId: "assessment-item",
    itemVersion: "assessment-item-v1",
    skill: "reading",
    measurementEligible: true,
    masteryEligible: false,
    recordedAt: "2026-07-25T00:01:00.000Z",
  },
  "assessment.submitted": {
    sessionId: "assessment-session",
    enrollmentId: "enrollment",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    blueprintId: "foundation-screening",
    formVersion: "form-v1",
    scoringPolicyVersion: "assessment-scoring-v1",
    formHash: FORM_HASH,
    status: "submitted",
    calibrationStatus: "uncalibrated",
    masteryEligible: false,
    submittedAt: "2026-07-25T00:02:00.000Z",
  },
  "assessment.abandoned": {
    sessionId: "assessment-session",
    enrollmentId: "enrollment",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    blueprintId: "foundation-screening",
    formVersion: "form-v1",
    formHash: FORM_HASH,
    status: "abandoned",
    masteryEligible: false,
    abandonedAt: "2026-07-25T00:02:00.000Z",
  },
  "reader.started": {
    sessionId: "reader-session",
    enrollmentId: "enrollment",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    contentManifestSha256: MANIFEST_HASH,
    storyId: "reader-story",
    storyVersion: "reader-story-v1",
    formVersion: "reader-form-v1",
    formHash: FORM_HASH,
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support-v1",
    expectedItemCount: 3,
    startedAt: "2026-07-25T00:00:00.000Z",
  },
  "reader.attempt.recorded": {
    sessionId: "reader-session",
    attemptId: "reader-attempt",
    evidenceId: "reader-evidence",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    contentManifestSha256: MANIFEST_HASH,
    formHash: FORM_HASH,
    position: 0,
    itemId: "reader-item",
    itemVersion: "reader-item-v1",
    method: "reading-comprehension",
    skill: "reading",
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support-v1",
    answerExposure: "server-confidential",
    priorExposure: false,
    masteryEligible: true,
    outcome: "correct",
    score: 100,
    verification: "server-objective",
    recordedAt: "2026-07-25T00:01:00.000Z",
  },
  "reader.submitted": {
    sessionId: "reader-session",
    enrollmentId: "enrollment",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    storyId: "reader-story",
    storyVersion: "reader-story-v1",
    formVersion: "reader-form-v1",
    formHash: FORM_HASH,
    expectedItemCount: 3,
    attemptCount: 3,
    correctCount: 2,
    score: 67,
    method: "reading-comprehension",
    skill: "reading",
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support-v1",
    status: "submitted",
    submittedAt: "2026-07-25T00:02:00.000Z",
  },
  "reader.abandoned": {
    sessionId: "reader-session",
    enrollmentId: "enrollment",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    storyId: "reader-story",
    storyVersion: "reader-story-v1",
    formVersion: "reader-form-v1",
    formHash: FORM_HASH,
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support-v1",
    reason: "support-requested",
    status: "abandoned",
    abandonedAt: "2026-07-25T00:02:00.000Z",
  },
  "review.graded": {
    reviewLogId: "review-log",
    attemptId: "review-attempt",
    cardId: "review-card",
    resetEpoch: 2,
    contentVersion: "foundation-2026.07.3",
    contentManifestSha256: MANIFEST_HASH,
    wordId: "ni",
    wordVersion: "foundation-2026.07.3:vocabulary:ni:1",
    modality: "hanzi-reading-meaning-recall",
    schedulerVersion: "ts-fsrs-5.4.1:retention-0.9:no-fuzz:v1",
    rating: 3,
    previousCardRevision: 4,
    cardRevision: 5,
    scheduledAt: "2026-07-25T00:00:00.000Z",
    reviewedAt: "2026-07-25T00:01:00.000Z",
    nextDueAt: "2026-07-27T00:01:00.000Z",
    verification: "server-scheduled-self-rating",
    masteryEligible: false,
  },
};

const aggregateFor = (eventType: OutboxEventTypeV1) => {
  if (eventType === "review.graded") {
    return { type: "review_log", id: "review-log" };
  }
  if (eventType === "learning.attempt.recorded") {
    return { type: "learning_attempt", id: "learning-attempt" };
  }
  if (eventType === "assessment.attempt.recorded") {
    return { type: "assessment_attempt", id: "assessment-attempt" };
  }
  if (eventType.startsWith("assessment.")) {
    return { type: "assessment_session", id: "assessment-session" };
  }
  if (eventType.startsWith("reader.")) {
    return { type: "reader_session", id: "reader-session" };
  }
  return { type: "lesson_session", id: "lesson-session" };
};

const storedEvent = (
  eventType: OutboxEventTypeV1 = "lesson.started",
  payload: Record<string, unknown> = eventPayloads[eventType],
): StoredOutboxEvent => {
  const aggregate = aggregateFor(eventType);
  return {
    id: `event-${eventType}`,
    userId: "opaque-user",
    aggregateType: aggregate.type,
    aggregateId: aggregate.id,
    eventType,
    schemaVersion: 1,
    resetEpoch: 2,
    payloadJson: JSON.stringify(payload),
    attempts: 0,
    createdAt: 1_753_401_600_000,
  };
};

describe("outbox event contract", () => {
  it.each(OUTBOX_EVENT_TYPES)(
    "decodes the schema-v1 %s contract",
    (eventType) => {
      const result = decodeOutboxEvent(storedEvent(eventType));

      expect(result).toEqual({
        ok: true,
        envelope: {
          envelopeVersion: 1,
          eventId: `event-${eventType}`,
          tenantId: "opaque-user",
          eventType,
          schemaVersion: 1,
          aggregate: aggregateFor(eventType),
          resetEpoch: 2,
          createdAt: 1_753_401_600_000,
          payload: eventPayloads[eventType],
        },
      });
    },
  );

  it("rejects unknown event types and schema versions", () => {
    expect(decodeOutboxEvent({
      ...storedEvent(),
      eventType: "lesson.future",
    })).toEqual({
      ok: false,
      failureCode: "OUTBOX_UNSUPPORTED_EVENT_TYPE",
    });
    expect(decodeOutboxEvent({
      ...storedEvent(),
      schemaVersion: 2,
    })).toEqual({
      ok: false,
      failureCode: "OUTBOX_UNSUPPORTED_SCHEMA_VERSION",
    });
  });

  it("requires a bounded JSON object payload", () => {
    expect(decodeOutboxEvent({
      ...storedEvent(),
      payloadJson: "{",
    })).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_INVALID_JSON",
    });
    expect(decodeOutboxEvent({
      ...storedEvent(),
      payloadJson: "[]",
    })).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_NOT_OBJECT",
    });
    expect(decodeOutboxEvent({
      ...storedEvent(),
      payloadJson: JSON.stringify(eventPayloads["lesson.started"]),
    }, 8)).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_TOO_LARGE",
    });
  });

  it("rejects aggregate, reset epoch, and required payload-field mismatches", () => {
    expect(decodeOutboxEvent({
      ...storedEvent(),
      aggregateId: "another-session",
    })).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("lesson.started", {
      ...eventPayloads["lesson.started"],
      resetEpoch: 3,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("assessment.submitted", {
      ...eventPayloads["assessment.submitted"],
      masteryEligible: true,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
  });

  it("rejects semantically impossible scores, counts, hashes, and source methods", () => {
    expect(decodeOutboxEvent(storedEvent("lesson.started", {
      ...eventPayloads["lesson.started"],
      contentManifestSha256: "sha256:not-a-digest",
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("lesson.completed", {
      ...eventPayloads["lesson.completed"],
      requiredEvidenceCount: 2,
      requiredCorrectCount: 3,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("learning.attempt.recorded", {
      ...eventPayloads["learning.attempt.recorded"],
      outcome: "incorrect",
      score: 100,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("learning.attempt.recorded", {
      ...eventPayloads["learning.attempt.recorded"],
      source: "reader",
      method: "meaning-selection",
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("reader.attempt.recorded", {
      ...eventPayloads["reader.attempt.recorded"],
      supportMode: "assisted",
      masteryEligible: true,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("reader.attempt.recorded", {
      ...eventPayloads["reader.attempt.recorded"],
      outcome: "incorrect",
      score: 100,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("reader.submitted", {
      ...eventPayloads["reader.submitted"],
      score: 66,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("reader.abandoned", {
      ...eventPayloads["reader.abandoned"],
      reason: "reset-invalidated",
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("review.graded", {
      ...eventPayloads["review.graded"],
      rating: 5,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("review.graded", {
      ...eventPayloads["review.graded"],
      cardRevision: 7,
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
    expect(decodeOutboxEvent(storedEvent("review.graded", {
      ...eventPayloads["review.graded"],
      nextDueAt: "2026-07-24T00:01:00.000Z",
    }))).toEqual({
      ok: false,
      failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
    });
  });

  it("accepts lesson completion when the immutable form has no required gate items", () => {
    const payload = {
      ...eventPayloads["lesson.completed"],
      requiredEvidenceCount: 0,
      requiredCorrectCount: 0,
    };

    expect(() => encodeOutboxEventPayload({
      eventType: "lesson.completed",
      aggregateId: "lesson-session",
      resetEpoch: 2,
      payload,
    })).not.toThrow();
    expect(decodeOutboxEvent(storedEvent("lesson.completed", payload))).toMatchObject({
      ok: true,
    });
  });

  it("validates producer payloads before persisting only allow-listed fields", () => {
    const encoded = encodeOutboxEventPayload({
      eventType: "lesson.started",
      aggregateId: "lesson-session",
      resetEpoch: 2,
      payload: {
        ...eventPayloads["lesson.started"],
        idempotencyKey: "must-not-be-persisted",
        answer: "must-not-be-persisted",
      },
    });

    expect(JSON.parse(encoded)).toEqual(eventPayloads["lesson.started"]);
    expect(encoded).not.toMatch(/idempotency|answer|must-not/ui);
    expect(() => encodeOutboxEventPayload({
      eventType: "lesson.started",
      aggregateId: "different-session",
      resetEpoch: 2,
      payload: eventPayloads["lesson.started"],
    })).toThrow(/violates its event contract/u);
  });

  it("never persists Reader responses, forms, or answer keys", () => {
    const encoded = encodeOutboxEventPayload({
      eventType: "reader.attempt.recorded",
      aggregateId: "reader-session",
      resetEpoch: 2,
      payload: {
        ...eventPayloads["reader.attempt.recorded"],
        selectedOption: "private learner response",
        correctAnswer: "private answer key",
        form: { answer: "private answer key" },
        idempotencyKey: "private retry token",
      },
    });

    expect(JSON.parse(encoded)).toEqual(
      eventPayloads["reader.attempt.recorded"],
    );
    expect(encoded).not.toMatch(
      /selectedOption|correctAnswer|private|idempotency/ui,
    );
  });

  it("projects only contract fields and strips client retry keys without mutating input", () => {
    const payload = {
      ...eventPayloads["lesson.started"],
      idempotencyKey: "top-level-secret",
      metadata: {
        client_idempotency_key: "nested-secret",
        safe: "retained",
        list: [{ "client-idempotency-key": "array-secret", count: 1 }],
      },
    };

    const result = decodeOutboxEvent(storedEvent("lesson.started", payload));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected event to decode.");
    expect(result.envelope.payload).toEqual(
      eventPayloads["lesson.started"],
    );
    expect(JSON.stringify(result.envelope)).not.toMatch(/secret|idempotency/ui);
    expect(payload.idempotencyKey).toBe("top-level-secret");
    expect(sanitizeOutboxJson(payload as never)).toMatchObject({
      metadata: {
        safe: "retained",
        list: [{ count: 1 }],
      },
    });
  });

  it("rejects invalid outer records without throwing or echoing them", () => {
    expect(decodeOutboxEvent({
      email: "learner@example.com",
      payloadJson: "{}",
    })).toEqual({
      ok: false,
      failureCode: "OUTBOX_INVALID_RECORD",
    });
  });
});
