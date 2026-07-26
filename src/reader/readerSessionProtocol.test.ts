import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { MAX_LEARNING_RESET_EPOCH } from "../learning/resetEpoch";
import {
  hashOpenReaderSessionCommand,
  hashReaderSessionForm,
  isExactReaderSessionFormItemV1,
  isExactReaderSessionFormV1,
  parseOpenReaderSessionCommand,
  parseOpenReaderSessionReceipt,
  type OpenReaderSessionCommandV1,
  type OpenReaderSessionReceiptV1,
  type ReaderSessionFormV1,
} from "./readerSessionProtocol";

const form = (): ReaderSessionFormV1 => ({
  formSchemaVersion: 1,
  storyId: "reader-story-1",
  storyVersion: `${CONTENT_VERSION}:reader-story-1:1`,
  formVersion: `${CONTENT_VERSION}:reader-story-1:form:1`,
  script: "simplified",
  supportMode: "unassisted",
  supportPolicyVersion: "reader-support:1",
  items: [
    {
      position: 0,
      itemId: "reader-story-1:q1",
      itemVersion: `${CONTENT_VERSION}:reader-story-1:q1:1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "王老师说：“你好！”",
      prompt: "谁说了“你好”？",
      options: ["王老师", "学生"],
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: true,
    },
    {
      position: 1,
      itemId: "reader-story-1:q2",
      itemVersion: `${CONTENT_VERSION}:reader-story-1:q2:1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "学生回答：“老师好！”",
      prompt: "学生怎么回答？",
      options: ["老师好", "再见"],
      answerExposure: "public-client",
      priorExposure: false,
      masteryEligible: false,
    },
  ],
});
const openCommand = (): OpenReaderSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "reader-session:test:1",
  installationId: "installation-test",
  deviceId: "device-test",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: "enrollment-test",
  storyId: "reader-story-1",
  script: "simplified",
  supportMode: "unassisted",
});

const receipt = async (): Promise<OpenReaderSessionReceiptV1> => {
  const issuedForm = form();
  return {
    protocolVersion: 1,
    idempotencyKey: "reader-session:test:1",
    duplicate: false,
    sessionId: "reader-session-1",
    enrollmentId: "enrollment-test",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    storyId: issuedForm.storyId,
    storyVersion: issuedForm.storyVersion,
    formVersion: issuedForm.formVersion,
    formSchemaVersion: 1,
    script: issuedForm.script,
    supportMode: issuedForm.supportMode,
    supportPolicyVersion: issuedForm.supportPolicyVersion,
    expectedItemCount: issuedForm.items.length,
    form: issuedForm,
    formHash: await hashReaderSessionForm(issuedForm),
    status: "started",
    startedAt: "2026-07-26T05:00:00.000Z",
  };
};

describe("Reader Session V1 answer-free form", () => {
  it("accepts a dense form with only the reading-comprehension/reading construct", () => {
    const candidate = form();
    expect(isExactReaderSessionFormV1(
      candidate,
      candidate.items.length,
    )).toBe(true);
    expect(isExactReaderSessionFormItemV1(
      candidate.items[0],
      candidate.supportMode,
      0,
    )).toBe(true);
    expect(candidate.items.every((item) =>
      item.method === "reading-comprehension"
      && item.skill === "reading"
    )).toBe(true);
  });

  it("enforces mastery eligibility per item as an exact policy equivalence", () => {
    const cases = [
      {
        supportMode: "unassisted" as const,
        answerExposure: "server-confidential" as const,
        priorExposure: false,
        masteryEligible: true,
      },
      {
        supportMode: "assisted" as const,
        answerExposure: "server-confidential" as const,
        priorExposure: false,
        masteryEligible: false,
      },
      {
        supportMode: "unassisted" as const,
        answerExposure: "public-client" as const,
        priorExposure: false,
        masteryEligible: false,
      },
      {
        supportMode: "unassisted" as const,
        answerExposure: "server-confidential" as const,
        priorExposure: true,
        masteryEligible: false,
      },
    ];

    for (const policy of cases) {
      const candidate = form();
      candidate.supportMode = policy.supportMode;
      candidate.items = [{
        ...candidate.items[0],
        answerExposure: policy.answerExposure,
        priorExposure: policy.priorExposure,
        masteryEligible: policy.masteryEligible,
      }];
      expect(isExactReaderSessionFormV1(candidate)).toBe(true);
      candidate.items[0]!.masteryEligible = !policy.masteryEligible;
      expect(isExactReaderSessionFormV1(candidate)).toBe(false);
    }
  });

  it("rejects answer keys, explanations, unknown fields, and non-reading constructs", () => {
    const answerKey = form() as ReaderSessionFormV1 & {
      items: Array<ReaderSessionFormV1["items"][number] & {
        correctAnswer?: string;
      }>;
    };
    answerKey.items[0]!.correctAnswer = "王老师";
    expect(isExactReaderSessionFormV1(answerKey)).toBe(false);

    const explanation = form() as ReaderSessionFormV1 & {
      explanation?: string;
    };
    explanation.explanation = "server-only";
    expect(isExactReaderSessionFormV1(explanation)).toBe(false);

    const wrongMethod = form();
    Object.assign(wrongMethod.items[0]!, {
      method: "meaning-selection",
    });
    expect(isExactReaderSessionFormV1(wrongMethod)).toBe(false);

    const wrongSkill = form();
    Object.assign(wrongSkill.items[0]!, { skill: "vocabulary" });
    expect(isExactReaderSessionFormV1(wrongSkill)).toBe(false);
  });

  it("rejects sparse positions, duplicate identities, invalid Chinese stimuli, and ambiguous options", () => {
    const sparse = form();
    sparse.items[1]!.position = 2;
    expect(isExactReaderSessionFormV1(sparse)).toBe(false);

    const duplicateId = form();
    duplicateId.items[1]!.itemId = duplicateId.items[0]!.itemId;
    expect(isExactReaderSessionFormV1(duplicateId)).toBe(false);

    const duplicateVersion = form();
    duplicateVersion.items[1]!.itemVersion =
      duplicateVersion.items[0]!.itemVersion;
    expect(isExactReaderSessionFormV1(duplicateVersion)).toBe(false);

    const noChineseStimulus = form();
    noChineseStimulus.items[0]!.chineseStimulus = "Hello";
    expect(isExactReaderSessionFormV1(noChineseStimulus)).toBe(false);

    const duplicateOptions = form();
    duplicateOptions.items[0]!.options = ["老师", "老师"];
    expect(isExactReaderSessionFormV1(duplicateOptions)).toBe(false);

    const nonCanonicalOption = form();
    nonCanonicalOption.items[0]!.options = ["老师", " 学生 "];
    expect(isExactReaderSessionFormV1(nonCanonicalOption)).toBe(false);
  });

  it("hashes the canonical ordered form without answer or explanation material", async () => {
    const candidate = form();
    const reordered = {
      items: candidate.items,
      supportPolicyVersion: candidate.supportPolicyVersion,
      supportMode: candidate.supportMode,
      script: candidate.script,
      formVersion: candidate.formVersion,
      storyVersion: candidate.storyVersion,
      storyId: candidate.storyId,
      formSchemaVersion: candidate.formSchemaVersion,
    } as ReaderSessionFormV1;

    await expect(hashReaderSessionForm(candidate)).resolves.toMatch(
      /^sha256:[a-f0-9]{64}$/u,
    );
    await expect(hashReaderSessionForm(reordered)).resolves.toBe(
      await hashReaderSessionForm(candidate),
    );

    const changedPosition = form();
    changedPosition.items.reverse();
    await expect(hashReaderSessionForm(changedPosition)).resolves.not.toBe(
      await hashReaderSessionForm(candidate),
    );

    const changedExposure = form();
    changedExposure.items[0]!.priorExposure = true;
    changedExposure.items[0]!.masteryEligible = false;
    await expect(hashReaderSessionForm(changedExposure)).resolves.not.toBe(
      await hashReaderSessionForm(candidate),
    );

    const serialized = JSON.stringify(candidate);
    expect(serialized).not.toMatch(
      /correctAnswer|answerKey|correctOption|explanation/iu,
    );
  });
});

describe("Reader Session V1 open command and receipt", () => {
  it("accepts the exact current authority command and hashes it canonically", async () => {
    expect(parseOpenReaderSessionCommand(openCommand())).toEqual({
      ok: true,
      command: openCommand(),
    });
    await expect(hashOpenReaderSessionCommand(openCommand())).resolves.toMatch(
      /^[a-f0-9]{64}$/u,
    );
    await expect(hashOpenReaderSessionCommand({
      ...openCommand(),
    })).resolves.toBe(await hashOpenReaderSessionCommand(openCommand()));
  });

  it("rejects missing, unknown, server-owned, stale, or out-of-bounds command fields", () => {
    const missing = { ...openCommand() } as Record<string, unknown>;
    delete missing.storyId;
    expect(parseOpenReaderSessionCommand(missing)).toMatchObject({
      ok: false,
    });

    for (const forbidden of [
      "storyVersion",
      "formVersion",
      "answerExposure",
      "priorExposure",
      "masteryEligible",
      "correctness",
      "score",
      "skill",
      "supportUsed",
    ]) {
      expect(parseOpenReaderSessionCommand({
        ...openCommand(),
        [forbidden]: "client-authored",
      })).toMatchObject({ ok: false });
    }

    expect(parseOpenReaderSessionCommand({
      ...openCommand(),
      contentVersion: "stale-reader-content",
    })).toMatchObject({ ok: false });
    expect(parseOpenReaderSessionCommand({
      ...openCommand(),
      resetEpoch: MAX_LEARNING_RESET_EPOCH + 1,
    })).toMatchObject({ ok: false });
    expect(parseOpenReaderSessionCommand({
      ...openCommand(),
      script: "pinyin",
    })).toMatchObject({ ok: false });
    expect(parseOpenReaderSessionCommand({
      ...openCommand(),
      supportMode: "sometimes-assisted",
    })).toMatchObject({ ok: false });
  });

  it("parses only a receipt whose duplicated authority and hash bind the exact form", async () => {
    const candidate = await receipt();
    await expect(parseOpenReaderSessionReceipt(candidate)).resolves.toEqual({
      ok: true,
      receipt: candidate,
    });

    await expect(parseOpenReaderSessionReceipt({
      ...candidate,
      storyVersion: "substituted-story-version",
    })).resolves.toMatchObject({ ok: false });

    const tamperedForm = structuredClone(candidate.form);
    tamperedForm.items[0]!.options[0] = "别人";
    await expect(parseOpenReaderSessionReceipt({
      ...candidate,
      form: tamperedForm,
    })).resolves.toMatchObject({ ok: false });

    await expect(parseOpenReaderSessionReceipt({
      ...candidate,
      formHash: `sha256:${"f".repeat(64)}`,
    })).resolves.toMatchObject({ ok: false });

    await expect(parseOpenReaderSessionReceipt({
      ...candidate,
      answerKey: "forbidden",
    })).resolves.toMatchObject({ ok: false });
  });
});
