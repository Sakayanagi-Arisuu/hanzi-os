import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  parseAbandonAssessmentSessionCommand,
  type AbandonAssessmentSessionCommandV1,
} from "./assessmentAbandonmentProtocol";
import {
  parseRecordAssessmentAttemptCommand,
  type RecordAssessmentAttemptCommandV1,
} from "./assessmentAttemptProtocol";
import {
  parseOpenAssessmentSessionCommand,
  type OpenAssessmentSessionCommandV1,
} from "./assessmentSessionProtocol";
import {
  parseSubmitAssessmentSessionCommand,
  type SubmitAssessmentSessionCommandV1,
} from "./assessmentSubmissionProtocol";

const formHash = `sha256:${"a".repeat(64)}` as const;
const common = {
  protocolVersion: 1 as const,
  idempotencyKey: "assessment:protocol:1",
  installationId: "installation-protocol",
  deviceId: "device-protocol",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
};

const open = (): OpenAssessmentSessionCommandV1 => ({
  ...common,
  enrollmentId: "enrollment-protocol",
});
const attempt = (): RecordAssessmentAttemptCommandV1 => ({
  ...common,
  sessionId: "session-protocol",
  formHash,
  itemId: "item-1",
  itemVersion: `${CONTENT_VERSION}:assessment-item:item-1:1`,
  occurredAt: "2026-07-22T10:00:00+07:00",
  response: { kind: "selection", answer: "你", durationMs: 1200 },
});
const submit = (): SubmitAssessmentSessionCommandV1 => ({
  ...common,
  sessionId: "session-protocol",
  formHash,
});
const abandon = (): AbandonAssessmentSessionCommandV1 => ({
  ...common,
  sessionId: "session-protocol",
  formHash,
});

describe("assessment command protocols", () => {
  it("accepts only exact open fields and current content", () => {
    expect(parseOpenAssessmentSessionCommand(open())).toEqual({
      ok: true,
      command: open(),
    });
    expect(parseOpenAssessmentSessionCommand({ ...open(), score: 100 }).ok)
      .toBe(false);
    const { enrollmentId: _missing, ...missing } = open();
    expect(parseOpenAssessmentSessionCommand(missing).ok).toBe(false);
    expect(parseOpenAssessmentSessionCommand({
      ...open(),
      contentVersion: "stale",
    }).ok).toBe(false);
  });

  it("normalizes timestamps but rejects client-authored outcomes and keys", () => {
    const parsed = parseRecordAssessmentAttemptCommand(attempt());
    expect(parsed).toMatchObject({
      ok: true,
      command: { occurredAt: "2026-07-22T03:00:00.000Z" },
    });
    expect(parseRecordAssessmentAttemptCommand({
      ...attempt(),
      correct: true,
    }).ok).toBe(false);
    expect(parseRecordAssessmentAttemptCommand({
      ...attempt(),
      response: { ...attempt().response, answerKey: "你" },
    }).ok).toBe(false);
    expect(parseRecordAssessmentAttemptCommand({
      ...attempt(),
      formHash: "sha256:not-a-hash",
    }).ok).toBe(false);
  });

  it("keeps submit and abandon terminal commands score-free and exact", () => {
    expect(parseSubmitAssessmentSessionCommand(submit())).toEqual({
      ok: true,
      command: submit(),
    });
    expect(parseAbandonAssessmentSessionCommand(abandon())).toEqual({
      ok: true,
      command: abandon(),
    });
    const historicalAbandonment = {
      ...abandon(),
      contentVersion: "foundation-retired-2026.06",
    };
    expect(parseAbandonAssessmentSessionCommand(historicalAbandonment)).toEqual({
      ok: true,
      command: historicalAbandonment,
    });
    expect(parseSubmitAssessmentSessionCommand({
      ...submit(),
      observedAccuracy: 100,
    }).ok).toBe(false);
    const { formHash: _missing, ...missing } = abandon();
    expect(parseAbandonAssessmentSessionCommand(missing).ok).toBe(false);
    expect(parseAbandonAssessmentSessionCommand({
      ...abandon(),
      contentVersion: "",
    }).ok).toBe(false);
  });
});
