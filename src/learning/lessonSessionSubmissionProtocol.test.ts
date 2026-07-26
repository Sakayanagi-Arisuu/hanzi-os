import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { MAX_LEARNING_RESET_EPOCH } from "./resetEpoch";
import {
  hashSubmitLessonSessionCommand,
  parseSubmitLessonSessionCommand,
  type SubmitLessonSessionCommandV1,
} from "./lessonSessionSubmissionProtocol";

const command = (): SubmitLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session-submit:test:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 20,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  sessionId: "session-test",
  formHash: `sha256:${"a".repeat(64)}`,
});

describe("lesson-session submission protocol", () => {
  it("accepts only the bounded current-version command", () => {
    expect(parseSubmitLessonSessionCommand(command())).toEqual({
      ok: true,
      command: command(),
    });
  });

  it("rejects all client-authored scoring and completion fields", () => {
    expect(parseSubmitLessonSessionCommand({
      ...command(),
      rawScore: 100,
      passed: true,
      evidenceCount: 10,
      lessonVersion: "invented",
    })).toMatchObject({ ok: false });
  });

  it.each(["previous-release-fixture", "future-release-fixture"])(
    "permanently rejects unsupported content version %s",
    (contentVersion) => {
      expect(parseSubmitLessonSessionCommand({
        ...command(),
        contentVersion,
      })).toEqual({
        ok: false,
        reason: "Lesson-session submission content version is unsupported.",
      });
    },
  );

  it("rejects unsafe device sequences", () => {
    expect(parseSubmitLessonSessionCommand({
      ...command(),
      deviceSequence: 0,
    })).toMatchObject({ ok: false });
  });

  it("rejects reset epochs outside the shared integer bound", () => {
    expect(parseSubmitLessonSessionCommand({
      ...command(),
      resetEpoch: MAX_LEARNING_RESET_EPOCH + 1,
    })).toMatchObject({ ok: false });
    expect(parseSubmitLessonSessionCommand({
      ...command(),
      resetEpoch: -1,
    })).toMatchObject({ ok: false });
  });

  it("hashes the canonical command deterministically", async () => {
    await expect(hashSubmitLessonSessionCommand(command())).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    );
    await expect(hashSubmitLessonSessionCommand(command())).resolves.toBe(
      await hashSubmitLessonSessionCommand({ ...command() }),
    );
  });
});
