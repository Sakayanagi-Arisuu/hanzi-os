import { describe, expect, it } from "vitest";
import {
  loadHsk4ReviewManifestBundle,
} from "./hsk4ReviewManifest.mjs";
import {
  buildHsk4ReviewAssignmentDocument,
  validateCompletedHsk4ReviewDocument,
  validateHsk4ReviewWorkflow,
} from "./hsk4ReviewWorkflow.mjs";

const ASSIGNED_AT = "2026-07-30T02:00:00.000Z";
const REVIEWED_AT = "2026-07-30T03:00:00.000Z";
const NOW = Date.parse("2026-07-30T04:00:00.000Z");
const AUDIO_BATCH_ID =
  "hsk4-personal-community-analysis-concept-actor-map:long-form-review-v1";
const INTEGRATION_BATCH_ID =
  "hsk4-long-input-structure-map-lesson-01:integration-review-v1";

type ReviewBatch = {
  batchId: string;
  sourceKind: string;
  requiredRoles: string[];
  targetCounts: Record<string, number> & {
    assessmentItems: number;
  };
};

const manifestAssessmentBatch = () => {
  const bundle = loadHsk4ReviewManifestBundle();
  const batches = bundle.manifest.reviewBatches as ReviewBatch[];
  const batch = batches.find((candidate) =>
    candidate.sourceKind === "level-assessment"
    && candidate.targetCounts.assessmentItems > 0
  );
  if (!batch) throw new Error("HSK4 assessment review fixture is missing");
  return batch;
};

const assignment = (
  batchId = manifestAssessmentBatch().batchId,
  role = "native-mandarin-reviewer",
) =>
  buildHsk4ReviewAssignmentDocument({
    assignmentId: `hsk4-review-fixture-${role}`,
    batchId,
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

const assessmentTotals = () => {
  const bundle = loadHsk4ReviewManifestBundle();
  const reviewBatches = bundle.manifest.reviewBatches as ReviewBatch[];
  const batches = reviewBatches.filter(
    (batch) => batch.sourceKind === "level-assessment",
  );
  return {
    batches: batches.length,
    roleAssignments: batches.reduce(
      (total, batch) => total + batch.requiredRoles.length,
      0,
    ),
    exactTargets: batches.reduce(
      (total, batch) =>
        total + Object.values(batch.targetCounts).reduce(
          (sum, count) => sum + count,
          0,
        ),
      0,
    ),
  };
};

describe("HSK4 local review assignment/import contract", () => {
  it("resolves every exact manifest batch without importing approvals", async () => {
    const assessment = assessmentTotals();
    await expect(validateHsk4ReviewWorkflow()).resolves.toEqual({
      manifestId: "hsk4-review-manifest-2026.07",
      manifestSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      batches: 156 + assessment.batches,
      roleAssignments: 585 + assessment.roleAssignments,
      exactTargets: 2681 + assessment.exactTargets,
      approvalsImportedIntoManifest: 0,
      runtimeMutations: 0,
    });
  });

  it("exports exact assessment targets without collapsing HSK4 target types", async () => {
    const batch = manifestAssessmentBatch();
    const document = await assignment(batch.batchId);

    expect(document.assignment).toMatchObject({
      batchId: batch.batchId,
      role: "native-mandarin-reviewer",
      targets: {
        assessmentItemIds: expect.any(Array),
        sourceTextIds: expect.any(Array),
        rubricIds: expect.any(Array),
      },
      policy: {
        reviewDoesNotPublish: true,
        reviewDoesNotCalibrate: true,
        reviewDoesNotGrantMastery: true,
        importWritesLocalReceiptOnly: true,
      },
    });
    expect(document.assignment.targets.assessmentItemIds).toHaveLength(
      batch.targetCounts.assessmentItems,
    );
    expect(document.response.targetDecisions).toHaveLength(
      Object.values(batch.targetCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
    );
  });

  it("keeps bound source texts distinct from source-owned texts", async () => {
    const document = await assignment(INTEGRATION_BATCH_ID);

    expect(document.assignment.targets).toMatchObject({
      textIds: [],
      sourceTextIds: expect.arrayContaining([
        "hsk4-personal-community-analysis-process-timeline:reading-01",
        "hsk4-personal-community-analysis-process-timeline:listening-01",
      ]),
      promptIds: expect.any(Array),
      rubricIds: expect.any(Array),
    });
    expect(document.assignment.targets.sourceTextIds).toHaveLength(4);
    expect(document.assignment.targets.promptIds).toHaveLength(8);
    expect(document.assignment.targets.rubricIds).toHaveLength(3);
  });

  it("accepts a complete response and returns a local-only receipt", async () => {
    const document = complete(await assignment(), "changes-requested");
    const result = await validateCompletedHsk4ReviewDocument(document, {
      nowEpochMs: NOW,
    });

    expect(result).toMatchObject({
      valid: true,
      errors: [],
      receipt: {
        assignmentSha256: document.assignmentSha256,
        batchId: document.assignment.batchId,
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

    await expect(validateCompletedHsk4ReviewDocument(reordered, {
      nowEpochMs: NOW,
    })).resolves.toMatchObject({ valid: true, errors: [] });
  });

  it("rejects assignment tampering and incomplete or mismatched decisions", async () => {
    const tampered = complete(await assignment(), "approved");
    tampered.assignment.sourceSha256 = `sha256:${"f".repeat(64)}`;
    const tamperedResult = await validateCompletedHsk4ReviewDocument(
      tampered,
      { nowEpochMs: NOW },
    );
    expect(tamperedResult.errors).toEqual(expect.arrayContaining([
      "review assignment no longer matches the exact manifest batch",
      "assignmentSha256 does not match the assignment",
    ]));

    const incomplete = complete(await assignment(), "approved");
    incomplete.response.targetDecisions.pop();
    expect((await validateCompletedHsk4ReviewDocument(
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
    expect((await validateCompletedHsk4ReviewDocument(
      mismatched,
      { nowEpochMs: NOW },
    )).errors).toContain(
      "review response outcome does not match target decisions",
    );

    const malformed = structuredClone(await assignment());
    Reflect.set(malformed, "assignment", null);
    await expect(validateCompletedHsk4ReviewDocument(
      malformed,
      { nowEpochMs: NOW },
    )).resolves.toMatchObject({
      valid: false,
      receipt: null,
      errors: expect.arrayContaining([
        "review assignment schema or policy is invalid",
      ]),
    });
  });

  it("blocks rights approval only when an exact batch still targets absent audio", async () => {
    const document = complete(
      await assignment(AUDIO_BATCH_ID, "audio-rights-reviewer"),
      "approved",
    );
    const result = await validateCompletedHsk4ReviewDocument(document, {
      nowEpochMs: NOW,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "audio-rights review cannot approve while targeted HSK4 audio is absent",
    );
  });

  it("rejects future/noncanonical timestamps, unsafe IDs and unsupported roles", async () => {
    const batchId = manifestAssessmentBatch().batchId;
    await expect(buildHsk4ReviewAssignmentDocument({
      assignmentId: "hsk4-time-fixture",
      batchId,
      role: "native-mandarin-reviewer",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: "2026-07-30T02:00:00Z",
      nowEpochMs: NOW,
    })).rejects.toThrow("assignedAt must be canonical UTC");
    await expect(buildHsk4ReviewAssignmentDocument({
      assignmentId: "../unsafe",
      batchId,
      role: "native-mandarin-reviewer",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: ASSIGNED_AT,
      nowEpochMs: NOW,
    })).rejects.toThrow("must be a safe identifier");
    await expect(buildHsk4ReviewAssignmentDocument({
      assignmentId: "hsk4-role-fixture",
      batchId,
      role: "administrator",
      assignedBy: "coordinator",
      assignee: "reviewer",
      assignedAt: ASSIGNED_AT,
      nowEpochMs: NOW,
    })).rejects.toThrow("is not required");
  });
});
