import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  hashAbandonLessonSessionCommand,
  parseAbandonLessonSessionCommand,
  type AbandonLessonSessionCommandV1,
} from "./lessonSessionAbandonmentProtocol";
import { MAX_LEARNING_RESET_EPOCH } from "./resetEpoch";

const command = (): AbandonLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session-abandon:test:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 21,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "session-test",
});

describe("lesson-session abandonment protocol", () => {
  it("accepts only the bounded current-version command", () => {
    expect(parseAbandonLessonSessionCommand(command())).toEqual({
      ok: true,
      command: command(),
    });
  });

  it("rejects client-authored terminal facts", () => {
    expect(parseAbandonLessonSessionCommand({
      ...command(),
      status: "abandoned",
      lessonId: "invented",
      abandonedAt: "2026-07-22T08:00:00.000Z",
    })).toMatchObject({ ok: false });
  });

  it.each(["previous-release-fixture", "future-release-fixture"])(
    "rejects unsupported content version %s",
    (contentVersion) => {
      expect(parseAbandonLessonSessionCommand({
        ...command(),
        contentVersion,
      })).toEqual({
        ok: false,
        reason: "Lesson-session abandonment content version is unsupported.",
      });
    },
  );

  it("rejects unsafe sequences and reset epochs", () => {
    expect(parseAbandonLessonSessionCommand({
      ...command(),
      deviceSequence: 0,
    })).toMatchObject({ ok: false });
    expect(parseAbandonLessonSessionCommand({
      ...command(),
      resetEpoch: -1,
    })).toMatchObject({ ok: false });
    expect(parseAbandonLessonSessionCommand({
      ...command(),
      resetEpoch: MAX_LEARNING_RESET_EPOCH + 1,
    })).toMatchObject({ ok: false });
  });

  it("hashes the canonical command deterministically", async () => {
    await expect(hashAbandonLessonSessionCommand(command())).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    );
    await expect(hashAbandonLessonSessionCommand(command())).resolves.toBe(
      await hashAbandonLessonSessionCommand({ ...command() }),
    );
  });
});
