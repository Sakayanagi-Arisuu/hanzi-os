import { describe, expect, it } from "vitest";
import {
  buildHsk1ReviewAssignmentDocument,
  validateCompletedHsk1ReviewDocument,
  validateHsk1ReviewWorkflow,
} from "./hsk1ReviewWorkflow.mjs";

const ASSIGNED_AT = "2026-07-28T10:00:00.000Z";
const REVIEWED_AT = "2026-07-28T11:00:00.000Z";
const NOW = Date.parse("2026-07-28T12:00:00.000Z");
const BATCH_ID =
  "hsk1-level-check-items-2026.07:listening-review-1";

const assignment = (role = "native-mandarin-reviewer") =>
  buildHsk1ReviewAssignmentDocument({
    assignmentId: `hsk1-listening-review-1-${role}`,
    batchId: BATCH_ID,
    role,
    assignedBy: "local-review-coordinator",
    assignee: "reviewer-fixture",
    assignedAt: ASSIGNED_AT,
    nowEpochMs: NOW,
  });

const complete = (
  document: Awaited<ReturnType<typeof assignment>>,
  decision: "approved" | "changes-requested" | "rejected",
) => {
  const result = structuredClone(document);
  Reflect.set(result.response, "reviewedAt", REVIEWED_AT);
  Reflect.set(result.response, "outcome", decision);
  result.response.targetDecisions.forEach((target) => {
    Reflect.set(target, "decision", decision);
  });
  return result;
};

describe("HSK1 local review assignment/import contract", () => {
  it("resolves every exact manifest batch without importing approvals", async () => {
    await expect(validateHsk1ReviewWorkflow()).resolves.toEqual({
      manifestId: "hsk1-review-manifest-2026.07",
      manifestSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      batches: 85,
      roleAssignments: 258,
      exactTargets: expect.any(Number),
      approvalsImportedIntoManifest: 0,
      runtimeMutations: 0,
    });
  });

  it("exports an exact assignment with a per-target response template", async () => {
    const document = await assignment();

    expect(document.assignment).toMatchObject({
      batchId: BATCH_ID,
      role: "native-mandarin-reviewer",
      targets: {
        assessmentItemIds: [
          "hsk1-level-check:listening:01",
          "hsk1-level-check:listening:02",
          "hsk1-level-check:listening:03",
          "hsk1-level-check:listening:04",
          "hsk1-level-check:listening:05",
        ],
      },
      policy: {
        reviewDoesNotPublish: true,
        reviewDoesNotCalibrate: true,
        reviewDoesNotGrantMastery: true,
        importWritesLocalReceiptOnly: true,
      },
    });
    expect(document.response.targetDecisions).toHaveLength(5);
    expect(document.response.targetDecisions.every(
      (target) => target.decision === null,
    )).toBe(true);
  });

  it("accepts a complete exact response and returns a local-only receipt", async () => {
    const document = complete(await assignment(), "changes-requested");
    const result = await validateCompletedHsk1ReviewDocument(document, {
      nowEpochMs: NOW,
    });

    expect(result).toMatchObject({
      valid: true,
      errors: [],
      receipt: {
        assignmentSha256: document.assignmentSha256,
        batchId: BATCH_ID,
        role: "native-mandarin-reviewer",
        outcome: "changes-requested",
        policy: {
          reviewDoesNotPublish: true,
          reviewDoesNotCalibrate: true,
          reviewDoesNotGrantMastery: true,
          importWritesLocalReceiptOnly: true,
        },
        receiptSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      },
    });
  });

  it("accepts harmless assignment object-key reordering", async () => {
    const original = complete(await assignment(), "changes-requested");
    const reordered = structuredClone(original);
    reordered.assignment.targets = Object.fromEntries(
      Object.entries(reordered.assignment.targets).reverse(),
    ) as typeof reordered.assignment.targets;
    reordered.assignment.policy = Object.fromEntries(
      Object.entries(reordered.assignment.policy).reverse(),
    ) as typeof reordered.assignment.policy;

    await expect(validateCompletedHsk1ReviewDocument(reordered, {
      nowEpochMs: NOW,
    })).resolves.toMatchObject({ valid: true, errors: [] });
  });

  it("rejects assignment tampering and incomplete or mismatched decisions", async () => {
    const tampered = complete(await assignment(), "approved");
    tampered.assignment.sourceSha256 = `sha256:${"f".repeat(64)}`;
    const tamperedResult = await validateCompletedHsk1ReviewDocument(
      tampered,
      { nowEpochMs: NOW },
    );
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.errors).toEqual(expect.arrayContaining([
      "review assignment no longer matches the exact manifest batch",
      "assignmentSha256 does not match the assignment",
    ]));

    const incomplete = complete(await assignment(), "approved");
    incomplete.response.targetDecisions.pop();
    expect((await validateCompletedHsk1ReviewDocument(
      incomplete,
      { nowEpochMs: NOW },
    )).errors).toContain(
      "review response must decide every exact target once",
    );

    const mismatched = complete(await assignment(), "approved");
    Reflect.set(
      mismatched.response.targetDecisions[0],
      "decision",
      "rejected",
    );
    expect((await validateCompletedHsk1ReviewDocument(
      mismatched,
      { nowEpochMs: NOW },
    )).errors).toContain(
      "review response outcome does not match target decisions",
    );
  });

  it("does not allow absent listening audio to receive rights approval", async () => {
    const document = complete(
      await assignment("audio-rights-reviewer"),
      "approved",
    );
    const result = await validateCompletedHsk1ReviewDocument(document, {
      nowEpochMs: NOW,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "audio-rights review cannot approve while listening audio is absent",
    );
  });

  it("rejects future/noncanonical timestamps and unsupported roles at export", async () => {
    await expect(buildHsk1ReviewAssignmentDocument({
      assignmentId: "review-time-fixture",
      batchId: BATCH_ID,
      role: "native-mandarin-reviewer",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: "2026-07-28T10:00:00Z",
      nowEpochMs: NOW,
    })).rejects.toThrow("assignedAt must be canonical UTC");
    await expect(buildHsk1ReviewAssignmentDocument({
      assignmentId: "review-role-fixture",
      batchId: BATCH_ID,
      role: "administrator",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: ASSIGNED_AT,
      nowEpochMs: NOW,
    })).rejects.toThrow("is not required");
  });
});
