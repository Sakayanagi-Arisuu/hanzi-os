import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import {
  hashGradeReviewCommand,
  parseGradeReviewCommand,
  parseReviewQueue,
  REVIEW_MODALITY,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type GradeReviewCommandV1,
} from "./reviewProtocol";

const wordId = RELEASED_LESSONS[0]!.wordIds[0]!;
const otherWordId = RELEASED_LESSONS
  .flatMap((lesson) => lesson.wordIds)
  .find((candidate) => candidate !== wordId)!;

const command = (
  overrides: Partial<GradeReviewCommandV1> = {},
): GradeReviewCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "review:test:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 7,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  cardId: "card-test",
  wordId,
  wordVersion: reviewWordVersion(wordId),
  expectedCardRevision: 1,
  rating: 3,
  durationMs: 1_500,
  ...overrides,
});

describe("review protocol", () => {
  it("accepts only bounded self-ratings without client-authored schedule fields", () => {
    expect(parseGradeReviewCommand(command())).toEqual({
      ok: true,
      command: command(),
    });
    expect(parseGradeReviewCommand({
      ...command(),
      nextDueAt: "2099-01-01T00:00:00.000Z",
    })).toMatchObject({ ok: false });
    expect(parseGradeReviewCommand({
      ...command(),
      masteryEligible: true,
    })).toMatchObject({ ok: false });
    expect(parseGradeReviewCommand(command({ rating: 0 as 1 })))
      .toMatchObject({ ok: false });
    expect(parseGradeReviewCommand(command({ expectedCardRevision: 0 })))
      .toMatchObject({ ok: false });
    expect(parseGradeReviewCommand(command({
      wordVersion: reviewWordVersion(otherWordId),
    }))).toMatchObject({ ok: false });
    const missingWord = { ...command() } as Partial<GradeReviewCommandV1>;
    delete missingWord.wordId;
    expect(parseGradeReviewCommand(missingWord)).toMatchObject({ ok: false });
  });

  it("rejects rating coercion from strings and booleans", () => {
    expect(parseGradeReviewCommand({
      ...command(),
      rating: "3",
    })).toMatchObject({ ok: false });
    expect(parseGradeReviewCommand({
      ...command(),
      rating: true,
    })).toMatchObject({ ok: false });
  });

  it("hashes the complete versioned command deterministically", async () => {
    await expect(hashGradeReviewCommand(command())).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    );
    await expect(hashGradeReviewCommand(command({ rating: 2 })))
      .resolves.not.toBe(await hashGradeReviewCommand(command()));
    await expect(hashGradeReviewCommand(command({
      wordId: otherWordId,
      wordVersion: reviewWordVersion(otherWordId),
    }))).resolves.not.toBe(await hashGradeReviewCommand(command()));
  });

  it("strictly parses a current owner-independent queue envelope", () => {
    const queue = {
      protocolVersion: 1,
      resetEpoch: 2,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      generatedAt: "2026-07-26T08:00:00.000Z",
      cards: [{
        cardId: "card-1",
        cardRevision: 3,
        wordId,
        wordVersion: reviewWordVersion(wordId),
        modality: REVIEW_MODALITY,
        dueAt: "2026-07-26T07:00:00.000Z",
        schedulerVersion: REVIEW_SCHEDULER_VERSION,
      }],
    };
    expect(parseReviewQueue(queue)).toEqual({ ok: true, queue });
    expect(parseReviewQueue({
      ...queue,
      cards: [{ ...queue.cards[0], answer: "client must not receive this" }],
    })).toMatchObject({ ok: false });
    expect(parseReviewQueue({
      ...queue,
      cards: [queue.cards[0], { ...queue.cards[0] }],
    })).toMatchObject({ ok: false });
    expect(parseReviewQueue({
      ...queue,
      cards: [
        queue.cards[0],
        { ...queue.cards[0], cardId: "card-2" },
      ],
    })).toMatchObject({ ok: false });
    expect(parseReviewQueue({
      ...queue,
      cards: [{
        ...queue.cards[0],
        dueAt: "2026-07-26T09:00:00.000Z",
      }],
    })).toMatchObject({ ok: false });
  });
});
