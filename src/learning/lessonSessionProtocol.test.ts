import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { MAX_LEARNING_RESET_EPOCH } from "./resetEpoch";
import {
  hashLessonSessionForm,
  hashOpenLessonSessionCommand,
  parseOpenLessonSessionCommand,
  type OpenLessonSessionCommandV1,
} from "./lessonSessionProtocol";

const command = (): OpenLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session:test:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: "enrollment-test",
  lessonId: "boot-1",
});

describe("lesson-session command protocol", () => {
  it("accepts only the bounded current-version command", () => {
    expect(parseOpenLessonSessionCommand(command())).toEqual({
      ok: true,
      command: command(),
    });
  });

  it("rejects client-authored server fields and unknown keys", () => {
    expect(parseOpenLessonSessionCommand({
      ...command(),
      lessonVersion: "invented",
      expectedEvidenceCount: 1,
      status: "submitted",
    })).toMatchObject({ ok: false });
  });

  it.each(["previous-release-fixture", "future-release-fixture"])(
    "permanently rejects unsupported content version %s",
    (contentVersion) => {
      expect(parseOpenLessonSessionCommand({
        ...command(),
        contentVersion,
      })).toEqual({
        ok: false,
        reason: "Lesson-session content version is unsupported.",
      });
    },
  );

  it("rejects invalid device sequences", () => {
    expect(parseOpenLessonSessionCommand({
      ...command(),
      deviceSequence: 0,
    })).toMatchObject({ ok: false });
  });

  it("rejects reset epochs outside the shared integer bound", () => {
    expect(parseOpenLessonSessionCommand({
      ...command(),
      resetEpoch: MAX_LEARNING_RESET_EPOCH + 1,
    })).toMatchObject({ ok: false });
    expect(parseOpenLessonSessionCommand({
      ...command(),
      resetEpoch: 1.5,
    })).toMatchObject({ ok: false });
  });

  it("hashes canonical commands deterministically", async () => {
    await expect(hashOpenLessonSessionCommand(command())).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    );
    await expect(hashOpenLessonSessionCommand(command())).resolves.toBe(
      await hashOpenLessonSessionCommand({ ...command() }),
    );
  });

  it("binds ordered form activities without embedding answer material", async () => {
    const form = {
      schemaVersion: 1 as const,
      script: "simplified" as const,
      activities: [{
        position: 0,
        activityId: "boot-1:yi-meaning",
        activityVersion: `${CONTENT_VERSION}:boot-1:1`,
        method: "meaning-selection" as const,
        skill: "vocabulary" as const,
        requiredForPass: false,
      }],
    };
    await expect(hashLessonSessionForm(form)).resolves.toMatch(
      /^sha256:[a-f0-9]{64}$/u,
    );
    await expect(hashLessonSessionForm({
      ...form,
      activities: [{ ...form.activities[0], position: 1 }],
    })).resolves.not.toBe(await hashLessonSessionForm(form));
    expect(JSON.stringify(form)).not.toMatch(/answer|correct/iu);
  });
});
