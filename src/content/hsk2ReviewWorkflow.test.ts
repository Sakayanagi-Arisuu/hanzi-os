import { describe, expect, it } from "vitest";
import {
  buildHsk2ReviewAssignmentDocument,
  validateCompletedHsk2ReviewDocument,
  validateHsk2ReviewWorkflow,
} from "./hsk2ReviewWorkflow.mjs";

const ASSIGNED_AT = "2026-07-29T02:00:00.000Z";
const REVIEWED_AT = "2026-07-29T03:00:00.000Z";
const NOW = Date.parse("2026-07-29T04:00:00.000Z");
const BATCH_ID =
  "hsk2-level-assessment-2026.07:hsk2-level-form-a:listening-objective:review-v1";

const assignment = (role = "native-mandarin-reviewer") =>
  buildHsk2ReviewAssignmentDocument({
    assignmentId: `hsk2-listening-form-a-${role}`,
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

describe("HSK2 local review assignment/import contract", () => {
  it("resolves every exact manifest batch without importing approvals", async () => {
    await expect(validateHsk2ReviewWorkflow()).resolves.toEqual({
      manifestId: "hsk2-review-manifest-2026.07",
      manifestSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      batches: 122,
      roleAssignments: expect.any(Number),
      exactTargets: expect.any(Number),
      approvalsImportedIntoManifest: 0,
      runtimeMutations: 0,
    });
  });

  it("exports an exact assessment assignment with per-target decisions", async () => {
    const document = await assignment();

    expect(document.assignment).toMatchObject({
      batchId: BATCH_ID,
      role: "native-mandarin-reviewer",
      targets: {
        assessmentItemIds: [
          "hsk2-level-check:form-a:listening:01",
          "hsk2-level-check:form-a:listening:02",
          "hsk2-level-check:form-a:listening:03",
          "hsk2-level-check:form-a:listening:04",
          "hsk2-level-check:form-a:listening:05",
          "hsk2-level-check:form-a:listening:06",
          "hsk2-level-check:form-a:listening:07",
          "hsk2-level-check:form-a:listening:08",
          "hsk2-level-check:form-a:listening:09",
          "hsk2-level-check:form-a:listening:10",
          "hsk2-level-check:form-a:listening:11",
          "hsk2-level-check:form-a:listening:12",
          "hsk2-level-check:form-a:listening:13",
          "hsk2-level-check:form-a:listening:14",
          "hsk2-level-check:form-a:listening:15",
        ],
      },
      policy: {
        reviewDoesNotPublish: true,
        reviewDoesNotCalibrate: true,
        reviewDoesNotGrantMastery: true,
        importWritesLocalReceiptOnly: true,
      },
    });
    expect(document.response.targetDecisions).toHaveLength(15);
  });

  it("accepts a complete response and returns a local-only receipt", async () => {
    const document = complete(await assignment(), "changes-requested");
    const result = await validateCompletedHsk2ReviewDocument(document, {
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

  it("rejects assignment tampering and incomplete decisions", async () => {
    const tampered = complete(await assignment(), "approved");
    tampered.assignment.sourceSha256 = `sha256:${"f".repeat(64)}`;
    const tamperedResult = await validateCompletedHsk2ReviewDocument(
      tampered,
      { nowEpochMs: NOW },
    );
    expect(tamperedResult.errors).toEqual(expect.arrayContaining([
      "review assignment no longer matches the exact manifest batch",
      "assignmentSha256 does not match the assignment",
    ]));

    const incomplete = complete(await assignment(), "approved");
    incomplete.response.targetDecisions.pop();
    expect((await validateCompletedHsk2ReviewDocument(
      incomplete,
      { nowEpochMs: NOW },
    )).errors).toContain(
      "review response must decide every exact target once",
    );
  });

  it("blocks absent listening audio from rights approval", async () => {
    const document = complete(
      await assignment("audio-rights-reviewer"),
      "approved",
    );
    const result = await validateCompletedHsk2ReviewDocument(document, {
      nowEpochMs: NOW,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "audio-rights review cannot approve while listening audio is absent",
    );
  });

  it("rejects noncanonical timestamps and unsupported roles", async () => {
    await expect(buildHsk2ReviewAssignmentDocument({
      assignmentId: "hsk2-time-fixture",
      batchId: BATCH_ID,
      role: "native-mandarin-reviewer",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: "2026-07-29T02:00:00Z",
      nowEpochMs: NOW,
    })).rejects.toThrow("assignedAt must be canonical UTC");
    await expect(buildHsk2ReviewAssignmentDocument({
      assignmentId: "hsk2-role-fixture",
      batchId: BATCH_ID,
      role: "administrator",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: ASSIGNED_AT,
      nowEpochMs: NOW,
    })).rejects.toThrow("is not required");
  });
});
