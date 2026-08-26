import { RELEASED_LESSONS, RELEASED_STORIES } from "../data/curriculum";
import { isMasteryEligibleEvidence } from "../lib/evidence";
import type { LearningAttemptCommandV1 } from "../learning/attemptProtocol";
import { answersMatch } from "../lib/exerciseGeneration";
import type { EvidenceOutcome, Skill } from "../types";
import { getAuthoritativeLessonAnswer } from "./authoritativeItemBank";
import {
  CURRENT_AUTHORITATIVE_READER_STORIES,
  authoritativeReaderItemByVersion,
  readerAnswersMatch,
} from "./authoritativeReaderItemBank";

export const OBJECTIVE_SCORING_POLICY_VERSION = "objective-policy-v1";

export type ObjectiveAttemptScore = {
  skill: Skill;
  outcome: Extract<EvidenceOutcome, "correct" | "incorrect">;
  score: 0 | 100;
  verified: true;
  baseMasteryEligible: boolean;
  requiredForPass: boolean;
  scoringVersion: string;
  metadata: Record<string, string | number | boolean | null>;
  sessionBinding: {
    lessonId: string;
    lessonVersion: string;
  } | null;
};

export class UnsupportedAttemptActivityError extends Error {
  readonly code = "ATTEMPT_ACTIVITY_UNSUPPORTED";
}

const parseActivityId = (activityId: string) => {
  const separator = activityId.indexOf(":");
  return separator > 0
    ? [activityId.slice(0, separator), activityId.slice(separator + 1)] as const
    : null;
};

const scoreLessonAttempt = (
  command: LearningAttemptCommandV1,
): ObjectiveAttemptScore => {
  const activity = parseActivityId(command.activityId);
  if (!activity) throw new UnsupportedAttemptActivityError("Lesson activity is invalid.");
  const [lessonId, questionId] = activity;
  const lesson = RELEASED_LESSONS.find((candidate) => candidate.id === lessonId);
  const answer = getAuthoritativeLessonAnswer(lessonId, questionId);
  if (
    !lesson
    || !answer
    || command.activityVersion !== answer.activityVersion
    || command.method !== answer.method
  ) {
    throw new UnsupportedAttemptActivityError(
      "Lesson activity version or method is not released.",
    );
  }
  const correct = answer.answers.some((candidate) =>
    answersMatch(command.response.answer, candidate)
  );
  return {
    skill: answer.skill,
    outcome: correct ? "correct" : "incorrect",
    score: correct ? 100 : 0,
    verified: true,
    baseMasteryEligible: !command.response.usedHint
      && isMasteryEligibleEvidence(answer.method, answer.skill),
    requiredForPass: answer.requiredForPass,
    scoringVersion: OBJECTIVE_SCORING_POLICY_VERSION,
    metadata: {
      questionId,
      wordId: answer.wordId ?? null,
      usedHint: command.response.usedHint,
      ...(command.response.durationMs === undefined
        ? {}
        : { durationMs: command.response.durationMs }),
    },
    sessionBinding: {
      lessonId,
      lessonVersion: `${lesson.contentVersion}:${lesson.id}:1`,
    },
  };
};

const scoreReaderAttempt = (
  command: LearningAttemptCommandV1,
): ObjectiveAttemptScore => {
  const activity = parseActivityId(command.activityId);
  if (!activity) throw new UnsupportedAttemptActivityError("Reader activity is invalid.");
  const [storyId, questionId] = activity;
  const story = RELEASED_STORIES.find((candidate) => candidate.id === storyId);
  const question = story?.comprehension.find((candidate) => candidate.id === questionId);
  if (
    !story
    || !question
    || command.method !== "reading-comprehension"
    || command.activityVersion !== `${story.contentVersion}:${question.id}:1`
  ) {
    throw new UnsupportedAttemptActivityError(
      "Reader activity version or method is not released.",
    );
  }
  const correct = answersMatch(command.response.answer, question.correctAnswer);
  return {
    skill: "reading",
    outcome: correct ? "correct" : "incorrect",
    score: correct ? 100 : 0,
    verified: true,
    // A reader response is objectively scored, but it cannot become mastery
    // evidence until a versioned reader session controls support/exposure.
    baseMasteryEligible: false,
    requiredForPass: false,
    scoringVersion: OBJECTIVE_SCORING_POLICY_VERSION,
    metadata: {
      questionId,
      usedHint: command.response.usedHint,
      ...(command.response.durationMs === undefined
        ? {}
        : { durationMs: command.response.durationMs }),
    },
    sessionBinding: null,
  };
};

const scoreMistakeAttempt = (
  command: LearningAttemptCommandV1,
): ObjectiveAttemptScore => {
  const originSource = command.activityVersion.includes(":reader-item:")
    ? "reader" as const
    : "lesson" as const;
  const originScore = originSource === "reader"
    ? (() => {
        const binding = authoritativeReaderItemByVersion(
          CURRENT_AUTHORITATIVE_READER_STORIES,
        ).get(command.activityVersion);
        if (
          !binding
          || command.activityId !== `${binding.story.id}:${binding.item.id}`
          || command.method !== "reading-comprehension"
        ) {
          throw new UnsupportedAttemptActivityError(
            "Reader remediation activity version or method is unavailable.",
          );
        }
        const correct = readerAnswersMatch(
          command.response.answer,
          binding.item.correctAnswer,
        );
        return {
          skill: "reading" as const,
          outcome: correct ? "correct" as const : "incorrect" as const,
          score: correct ? 100 as const : 0 as const,
          verified: true as const,
          baseMasteryEligible: false,
          requiredForPass: false,
          scoringVersion: OBJECTIVE_SCORING_POLICY_VERSION,
          metadata: {
            questionId: binding.item.id,
            usedHint: command.response.usedHint,
            ...(command.response.durationMs === undefined
              ? {}
              : { durationMs: command.response.durationMs }),
          },
          sessionBinding: null,
        };
      })()
    : scoreLessonAttempt({
        ...command,
        source: "lesson",
        sessionId: "remediation-origin-validation",
      });
  return {
    ...originScore,
    baseMasteryEligible: false,
    requiredForPass: false,
    sessionBinding: null,
    metadata: {
      ...originScore.metadata,
      originSource,
      originMethod: command.method,
      remediation: true,
    },
  };
};

export const scoreObjectiveAttempt = (
  command: LearningAttemptCommandV1,
): ObjectiveAttemptScore => {
  if (command.source === "lesson") return scoreLessonAttempt(command);
  if (command.source === "reader") return scoreReaderAttempt(command);
  if (command.source === "mistake") return scoreMistakeAttempt(command);
  throw new UnsupportedAttemptActivityError(
    "Only objective lesson, reader and remediation attempts are supported.",
  );
};
