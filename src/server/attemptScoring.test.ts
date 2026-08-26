import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_STORIES,
  WORD_BY_ID,
} from "../data/curriculum";
import type { LearningAttemptCommandV1 } from "../learning/attemptProtocol";
import {
  CURRENT_AUTHORITATIVE_READER_STORIES,
} from "./authoritativeReaderItemBank";
import {
  scoreObjectiveAttempt,
  UnsupportedAttemptActivityError,
} from "./attemptScoring";

const lesson = RELEASED_LESSONS[0];
const word = WORD_BY_ID.get(lesson.wordIds[0])!;

const lessonCommand = (): LearningAttemptCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "attempt:score:lesson",
  installationId: "installation",
  deviceId: "device",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  activityId: `${lesson.id}:${word.id}-meaning`,
  activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
  source: "lesson",
  method: "meaning-selection",
  sessionId: "lesson-session-score",
  occurredAt: "2026-07-22T06:00:00.000Z",
  response: { kind: "answer", answer: word.meaning, usedHint: false },
});

describe("authoritative objective attempt scoring", () => {
  it("derives lesson correctness and skill without a client answer key", () => {
    expect(scoreObjectiveAttempt(lessonCommand())).toMatchObject({
      skill: "vocabulary",
      outcome: "correct",
      score: 100,
      verified: true,
      baseMasteryEligible: true,
      sessionBinding: {
        lessonId: lesson.id,
        lessonVersion: `${lesson.contentVersion}:${lesson.id}:1`,
      },
    });
  });

  it("withholds mastery after a hint while retaining objective accuracy", () => {
    expect(scoreObjectiveAttempt({
      ...lessonCommand(),
      response: { ...lessonCommand().response, usedHint: true },
    })).toMatchObject({
      outcome: "correct",
      score: 100,
      baseMasteryEligible: false,
      metadata: { usedHint: true },
    });
  });

  it("re-scores remediation against the released activity without mastery", () => {
    const { sessionId: _sessionId, ...base } = lessonCommand();
    expect(scoreObjectiveAttempt({
      ...base,
      source: "mistake",
    })).toMatchObject({
      skill: "vocabulary",
      outcome: "correct",
      score: 100,
      baseMasteryEligible: false,
      requiredForPass: false,
      sessionBinding: null,
      metadata: {
        originSource: "lesson",
        originMethod: "meaning-selection",
        remediation: true,
      },
    });
  });

  it("re-grades reader answers from the released story", () => {
    const story = RELEASED_STORIES[0];
    const question = story.comprehension[0];
    expect(scoreObjectiveAttempt({
      ...lessonCommand(),
      idempotencyKey: "attempt:score:reader",
      activityId: `${story.id}:${question.id}`,
      activityVersion: `${story.contentVersion}:${question.id}:1`,
      source: "reader",
      method: "reading-comprehension",
      response: { kind: "answer", answer: question.correctAnswer, usedHint: false },
    })).toMatchObject({
      skill: "reading",
      outcome: "correct",
      baseMasteryEligible: false,
      sessionBinding: null,
    });
  });

  it("re-scores a current authoritative Reader mistake without granting mastery", () => {
    const story = CURRENT_AUTHORITATIVE_READER_STORIES[0];
    const item = story.items[0];
    const { sessionId: _sessionId, ...base } = lessonCommand();
    expect(scoreObjectiveAttempt({
      ...base,
      idempotencyKey: "attempt:score:reader-remediation",
      activityId: `${story.id}:${item.id}`,
      activityVersion: item.itemVersion,
      source: "mistake",
      method: "reading-comprehension",
      response: {
        kind: "answer",
        answer: item.correctAnswer,
        usedHint: false,
      },
    })).toMatchObject({
      skill: "reading",
      outcome: "correct",
      score: 100,
      baseMasteryEligible: false,
      requiredForPass: false,
      sessionBinding: null,
      metadata: {
        originSource: "reader",
        originMethod: "reading-comprehension",
        remediation: true,
      },
    });
  });

  it("fails closed for an invented activity version", () => {
    expect(() => scoreObjectiveAttempt({
      ...lessonCommand(),
      activityVersion: "invented",
    })).toThrow(UnsupportedAttemptActivityError);
  });
});
