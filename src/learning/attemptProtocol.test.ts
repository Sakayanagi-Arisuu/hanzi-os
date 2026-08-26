import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import { MAX_LEARNING_RESET_EPOCH } from "./resetEpoch";
import {
  ATTEMPT_PROTOCOL_VERSION,
  hashLearningAttemptCommand,
  parseLearningAttemptCommand,
  type LearningAttemptCommandV1,
} from "./attemptProtocol";

const lesson = RELEASED_LESSONS[0];
const wordId = lesson.wordIds[0];

const command = (): LearningAttemptCommandV1 => ({
  protocolVersion: ATTEMPT_PROTOCOL_VERSION,
  idempotencyKey: "attempt:test:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  activityId: `${lesson.id}:${wordId}-meaning`,
  activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
  source: "lesson",
  method: "meaning-selection",
  sessionId: "lesson-session-test",
  occurredAt: "2026-07-22T06:00:00.000Z",
  response: {
    kind: "answer",
    answer: "fixture",
    usedHint: false,
    durationMs: 1_200,
  },
});

describe("learning attempt command protocol", () => {
  it("parses a bounded objective command and normalizes its timestamp", () => {
    const parsed = parseLearningAttemptCommand({
      ...command(),
      occurredAt: "2026-07-22T13:00:00+07:00",
    });
    expect(parsed).toMatchObject({
      ok: true,
      command: { occurredAt: "2026-07-22T06:00:00.000Z" },
    });
  });

  it.each([
    ["correctAnswer", "答案"],
    ["outcome", "correct"],
    ["score", 100],
    ["verified", true],
    ["masteryEligible", true],
  ])("rejects client-authored trust field %s", (field, value) => {
    expect(parseLearningAttemptCommand({
      ...command(),
      [field]: value,
    })).toMatchObject({ ok: false });
  });

  it("rejects an incompatible source and method", () => {
    expect(parseLearningAttemptCommand({
      ...command(),
      source: "reader",
      method: "meaning-selection",
    })).toEqual({
      ok: false,
      reason: "Attempt source and method are incompatible.",
    });
  });

  it("requires a server-issued session for lesson attempts", () => {
    const { sessionId: _sessionId, ...withoutSession } = command();
    expect(parseLearningAttemptCommand(withoutSession)).toEqual({
      ok: false,
      reason: "Lesson attempts require a server-issued lesson session.",
    });
  });

  it("accepts an answer-only remediation command without a lesson session", () => {
    const { sessionId: _sessionId, ...withoutSession } = command();
    expect(parseLearningAttemptCommand({
      ...withoutSession,
      source: "mistake",
    })).toMatchObject({
      ok: true,
      command: { source: "mistake", method: "meaning-selection" },
    });
  });

  it("rejects a remediation command that tries to claim a lesson session", () => {
    expect(parseLearningAttemptCommand({
      ...command(),
      source: "mistake",
    })).toEqual({
      ok: false,
      reason: "Remediation attempts do not accept lesson sessions.",
    });
  });

  it.each(["previous-release-fixture", "future-release-fixture"])(
    "permanently rejects unsupported content version %s",
    (contentVersion) => {
      expect(parseLearningAttemptCommand({
        ...command(),
        contentVersion,
      })).toEqual({
        ok: false,
        reason: "Attempt content version is unsupported.",
      });
    },
  );

  it("rejects excessive responses", () => {
    expect(parseLearningAttemptCommand({
      ...command(),
      response: { ...command().response, answer: "x".repeat(2_001) },
    })).toMatchObject({ ok: false });
  });

  it("rejects reset epochs outside the shared integer bound", () => {
    expect(parseLearningAttemptCommand({
      ...command(),
      resetEpoch: MAX_LEARNING_RESET_EPOCH + 1,
    })).toMatchObject({ ok: false });
    expect(parseLearningAttemptCommand({
      ...command(),
      resetEpoch: "0",
    })).toMatchObject({ ok: false });
  });

  it("hashes the canonical command deterministically", async () => {
    const left = command();
    const right = JSON.parse(JSON.stringify(left)) as LearningAttemptCommandV1;
    expect(await hashLearningAttemptCommand(left)).toBe(
      await hashLearningAttemptCommand(right),
    );
  });
});
