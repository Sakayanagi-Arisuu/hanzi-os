import { describe, expect, it } from "vitest";
import { buildHsk1UnitReviewAssignmentSet } from "./hsk1UnitReviewAssignmentSet.mjs";

const NOW = Date.parse("2026-07-31T12:00:00.000Z");
const PACKET_ID = "hsk1-time-place-events-reviewer-packet-2026.07.1";
const PACKET_SHA256 =
  "sha256:0607206985b7b96552e99786858c04efd6693336d78c6356b6d4e5ef7e90a7bb";

const roster = () => ({
  schemaVersion: 1,
  packetId: PACKET_ID,
  packetSha256: PACKET_SHA256,
  assignmentPrefix: "hsk1-unit-review-fixture",
  assignedBy: "review-coordinator-fixture",
  assignedAt: "2026-07-31T10:00:00.000Z",
  reviewersByRole: {
    "assessment-editor": "assessment-reviewer-fixture",
    "grammar-pedagogy-reviewer": "grammar-reviewer-fixture",
    "native-mandarin-reviewer": "mandarin-reviewer-fixture",
    "task-pedagogy-reviewer": "task-reviewer-fixture",
    "vietnamese-editor": "vietnamese-reviewer-fixture",
  },
});

describe("HSK1 atomic-unit review assignment set", () => {
  it("builds all 81 exact packet slots without approving any of them", async () => {
    const result = await buildHsk1UnitReviewAssignmentSet({
      roster: roster(),
      nowEpochMs: NOW,
    });

    expect(result).toMatchObject({
      schemaVersion: 1,
      packetId: PACKET_ID,
      packetSha256: PACKET_SHA256,
      assignmentCount: 81,
      policy: {
        localAssignmentsOnly: true,
        rosterDoesNotApproveReview: true,
        rosterDoesNotAuthorizeAudio: true,
        rosterDoesNotAuthorizeImport: true,
        grantsMeasurementOrMastery: false,
      },
    });
    expect(result.documents).toHaveLength(81);
    expect(new Set(result.documents.map((document) =>
      `${document.assignment.batchId}:${document.assignment.role}`
    )).size).toBe(81);
    expect(result.documents[0].assignment.assignmentId).toBe(
      "hsk1-unit-review-fixture-001",
    );
    expect(result.documents[80].assignment.assignmentId).toBe(
      "hsk1-unit-review-fixture-081",
    );
    expect(result.documents.every((document) =>
      document.response.outcome === null
      && document.response.reviewedAt === null
      && document.response.targetDecisions.every(
        (decision: { decision: string | null }) => decision.decision === null,
      )
    )).toBe(true);
  }, 20_000);

  it("rejects a stale packet binding before producing assignments", async () => {
    const stale = roster();
    stale.packetSha256 = `sha256:${"f".repeat(64)}`;
    await expect(buildHsk1UnitReviewAssignmentSet({
      roster: stale,
      nowEpochMs: NOW,
    })).rejects.toThrow("does not bind the current packet");
  });

  it("rejects incomplete role maps", async () => {
    const incomplete = roster();
    Reflect.deleteProperty(incomplete.reviewersByRole, "assessment-editor");
    await expect(buildHsk1UnitReviewAssignmentSet({
      roster: incomplete,
      nowEpochMs: NOW,
    })).rejects.toThrow("must contain exactly");
  }, 20_000);

  it("rejects reviewer reuse across roles", async () => {
    const reused = roster();
    reused.reviewersByRole["assessment-editor"] =
      reused.reviewersByRole["native-mandarin-reviewer"];
    await expect(buildHsk1UnitReviewAssignmentSet({
      roster: reused,
      nowEpochMs: NOW,
    })).rejects.toThrow("cannot fill multiple roles");
  }, 20_000);
});
