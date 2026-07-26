import type {
  ActiveReaderAttemptProjectionV3,
  ActiveReaderSessionProjectionV3,
} from "../learning/projectionProtocol";
import {
  parseAbandonReaderSessionReceipt,
} from "./readerAbandonmentProtocol";
import {
  parseRecordReaderAttemptReceipt,
} from "./readerAttemptProtocol";
import {
  hashReaderSessionForm,
  isExactReaderSessionFormV1,
  type ReaderSessionAuthorityBindingV1,
} from "./readerSessionProtocol";
import {
  parseSubmitReaderSessionReceipt,
} from "./readerSubmissionProtocol";

const exactTimestamp = (value: string) => {
  const parsed = new Date(value);
  return value.length > 0
    && value.length <= 40
    && !Number.isNaN(parsed.getTime())
    && parsed.toISOString() === value;
};

const sameOptions = (
  left: readonly string[],
  right: readonly string[],
) => left.length === right.length
  && left.every((option, index) => option === right[index]);

const sameForm = (
  left: ReaderSessionAuthorityBindingV1["form"],
  right: ReaderSessionAuthorityBindingV1["form"],
) =>
  left.formSchemaVersion === right.formSchemaVersion
  && left.storyId === right.storyId
  && left.storyVersion === right.storyVersion
  && left.formVersion === right.formVersion
  && left.script === right.script
  && left.supportMode === right.supportMode
  && left.supportPolicyVersion === right.supportPolicyVersion
  && left.items.length === right.items.length
  && left.items.every((item, position) => {
    const expected = right.items[position];
    return Boolean(
      expected
      && item.position === expected.position
      && item.itemId === expected.itemId
      && item.itemVersion === expected.itemVersion
      && item.method === expected.method
      && item.skill === expected.skill
      && item.chineseStimulus === expected.chineseStimulus
      && item.prompt === expected.prompt
      && sameOptions(item.options, expected.options)
      && item.answerExposure === expected.answerExposure
      && item.priorExposure === expected.priorExposure
      && item.masteryEligible === expected.masteryEligible
    );
  });

export async function readerSessionAuthorityBindingIsExact(
  binding: ReaderSessionAuthorityBindingV1,
) {
  return binding.status === "started"
    && exactTimestamp(binding.startedAt)
    && binding.expectedItemCount === binding.form.items.length
    && isExactReaderSessionFormV1(
      binding.form,
      binding.expectedItemCount,
    )
    && binding.storyId === binding.form.storyId
    && binding.storyVersion === binding.form.storyVersion
    && binding.formVersion === binding.form.formVersion
    && binding.formSchemaVersion === binding.form.formSchemaVersion
    && binding.script === binding.form.script
    && binding.supportMode === binding.form.supportMode
    && binding.supportPolicyVersion === binding.form.supportPolicyVersion
    && binding.formHash === await hashReaderSessionForm(binding.form);
}

export function readerProjectionMatchesSessionBinding(
  session: ActiveReaderSessionProjectionV3,
  binding: ReaderSessionAuthorityBindingV1,
) {
  return session.sessionId === binding.sessionId
    && session.enrollmentId === binding.enrollmentId
    && session.resetEpoch === binding.resetEpoch
    && session.contentVersion === binding.contentVersion
    && session.storyId === binding.storyId
    && session.storyVersion === binding.storyVersion
    && session.formVersion === binding.formVersion
    && session.formSchemaVersion === binding.formSchemaVersion
    && session.script === binding.script
    && session.supportMode === binding.supportMode
    && session.supportPolicyVersion === binding.supportPolicyVersion
    && session.expectedItemCount === binding.expectedItemCount
    && session.formHash === binding.formHash
    && session.status === binding.status
    && session.startedAt === binding.startedAt
    && sameForm(session.form, binding.form);
}

export function readerProjectedAttemptMatchesSessionBinding(
  attempt: ActiveReaderAttemptProjectionV3,
  binding: ReaderSessionAuthorityBindingV1,
) {
  const item = binding.form.items[attempt.position];
  return Boolean(
    item
    && attempt.attemptId.length > 0
    && attempt.attemptId.length <= 160
    && attempt.evidenceId.length > 0
    && attempt.evidenceId.length <= 160
    && attempt.sessionId === binding.sessionId
    && attempt.resetEpoch === binding.resetEpoch
    && attempt.contentVersion === binding.contentVersion
    && attempt.formHash === binding.formHash
    && attempt.position === item.position
    && attempt.itemId === item.itemId
    && attempt.itemVersion === item.itemVersion
    && attempt.method === item.method
    && attempt.skill === item.skill
    && attempt.script === binding.script
    && attempt.supportMode === binding.supportMode
    && attempt.supportPolicyVersion === binding.supportPolicyVersion
    && attempt.answerExposure === item.answerExposure
    && attempt.priorExposure === item.priorExposure
    && attempt.masteryEligible === item.masteryEligible
    && (
      (attempt.outcome === "correct" && attempt.score === 100)
      || (attempt.outcome === "incorrect" && attempt.score === 0)
    )
    && attempt.verification === "server-objective"
    && attempt.status === "recorded"
    && exactTimestamp(attempt.recordedAt)
    && Date.parse(attempt.recordedAt) >= Date.parse(binding.startedAt)
  );
}

export function readerAttemptReceiptMatchesSessionBinding(
  value: unknown,
  binding: ReaderSessionAuthorityBindingV1,
  expectedCommandId: string,
  position: number,
) {
  const parsed = parseRecordReaderAttemptReceipt(value);
  if (!parsed.ok) return false;
  const receipt = parsed.receipt;
  const item = binding.form.items[position];
  return Boolean(
    item
    && receipt.idempotencyKey === expectedCommandId
    && receipt.position === position
    && readerProjectedAttemptMatchesSessionBinding(
      {
        attemptId: receipt.attemptId,
        evidenceId: receipt.evidenceId,
        sessionId: receipt.sessionId,
        resetEpoch: receipt.resetEpoch,
        contentVersion: receipt.contentVersion,
        formHash: receipt.formHash,
        position: receipt.position,
        itemId: receipt.itemId,
        itemVersion: receipt.itemVersion,
        method: receipt.method,
        skill: receipt.skill,
        script: receipt.script,
        supportMode: receipt.supportMode,
        supportPolicyVersion: receipt.supportPolicyVersion,
        answerExposure: receipt.answerExposure,
        priorExposure: receipt.priorExposure,
        masteryEligible: receipt.masteryEligible,
        outcome: receipt.outcome,
        score: receipt.score,
        verification: receipt.verification,
        status: receipt.status,
        recordedAt: receipt.recordedAt,
      },
      binding,
    )
  );
}

export function readerSubmissionReceiptMatchesSessionBinding(
  value: unknown,
  binding: ReaderSessionAuthorityBindingV1,
  expectedCommandId: string,
) {
  const parsed = parseSubmitReaderSessionReceipt(value);
  if (!parsed.ok) return false;
  const receipt = parsed.receipt;
  return receipt.idempotencyKey === expectedCommandId
    && receipt.sessionId === binding.sessionId
    && receipt.enrollmentId === binding.enrollmentId
    && receipt.resetEpoch === binding.resetEpoch
    && receipt.contentVersion === binding.contentVersion
    && receipt.storyId === binding.storyId
    && receipt.storyVersion === binding.storyVersion
    && receipt.formVersion === binding.formVersion
    && receipt.formHash === binding.formHash
    && receipt.expectedItemCount === binding.expectedItemCount
    && receipt.script === binding.script
    && receipt.supportMode === binding.supportMode
    && receipt.supportPolicyVersion === binding.supportPolicyVersion
    && receipt.results.every((result, position) => {
      const item = binding.form.items[position];
      return Boolean(
        item
        && result.position === item.position
        && result.itemId === item.itemId
        && result.itemVersion === item.itemVersion
        && result.answerExposure === item.answerExposure
        && result.priorExposure === item.priorExposure
        && result.masteryEligible === item.masteryEligible
      );
    })
    && exactTimestamp(receipt.submittedAt)
    && Date.parse(receipt.submittedAt) >= Date.parse(binding.startedAt);
}

export function readerAbandonmentReceiptMatchesSessionBinding(
  value: unknown,
  binding: ReaderSessionAuthorityBindingV1,
  expectedCommandId: string,
  expectedReason?: "user-exit" | "support-requested" | "superseded",
) {
  const parsed = parseAbandonReaderSessionReceipt(value);
  if (!parsed.ok) return false;
  const receipt = parsed.receipt;
  return receipt.idempotencyKey === expectedCommandId
    && receipt.sessionId === binding.sessionId
    && receipt.enrollmentId === binding.enrollmentId
    && receipt.resetEpoch === binding.resetEpoch
    && receipt.contentVersion === binding.contentVersion
    && receipt.storyId === binding.storyId
    && receipt.storyVersion === binding.storyVersion
    && receipt.formVersion === binding.formVersion
    && receipt.formHash === binding.formHash
    && receipt.script === binding.script
    && receipt.supportMode === binding.supportMode
    && receipt.supportPolicyVersion === binding.supportPolicyVersion
    && (expectedReason === undefined || receipt.reason === expectedReason)
    && exactTimestamp(receipt.abandonedAt)
    && Date.parse(receipt.abandonedAt) >= Date.parse(binding.startedAt);
}
