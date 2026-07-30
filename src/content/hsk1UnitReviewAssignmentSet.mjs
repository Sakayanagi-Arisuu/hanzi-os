import {
  assertSafeHsk1ReviewId,
  buildHsk1ReviewAssignmentDocument,
} from "./hsk1ReviewWorkflow.mjs";
import {
  assertValidHsk1UnitReviewerPacketBundle,
  loadHsk1UnitReviewerPacketBundle,
} from "./hsk1UnitReviewerPacket.mjs";

const ROSTER_KEYS = [
  "schemaVersion",
  "packetId",
  "packetSha256",
  "assignmentPrefix",
  "assignedBy",
  "assignedAt",
  "reviewersByRole",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value, keys) =>
  isRecord(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));

const sameStrings = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

const assignmentIdFor = (prefix, index) =>
  `${prefix}-${String(index + 1).padStart(3, "0")}`;

export const buildHsk1UnitReviewAssignmentSet = async ({
  root = process.cwd(),
  roster,
  nowEpochMs = Date.now(),
}) => {
  const packetBundle = loadHsk1UnitReviewerPacketBundle(root);
  const { packet } = packetBundle;

  if (!hasExactKeys(roster, ROSTER_KEYS) || roster.schemaVersion !== 1) {
    throw new Error("HSK1 unit review roster schema is invalid");
  }
  if (
    roster.packetId !== packet.packetId
    || roster.packetSha256 !== packet.packetSha256
  ) {
    throw new Error("HSK1 unit review roster does not bind the current packet");
  }
  await assertValidHsk1UnitReviewerPacketBundle(packetBundle);

  assertSafeHsk1ReviewId(roster.assignmentPrefix, "assignmentPrefix");
  assertSafeHsk1ReviewId(roster.assignedBy, "assignedBy");
  if (!isRecord(roster.reviewersByRole)) {
    throw new Error("reviewersByRole must be an object");
  }

  const slots = packet.reviewSlots;
  if (
    slots.length !== packet.counts.reviewSlots
    || slots.some((slot) =>
      slot.assignmentDocumentRequired !== true
      || slot.completedReviewReceiptId !== null
      || slot.packetChecklistState !== "not-reviewed"
    )
  ) {
    throw new Error("HSK1 unit reviewer packet is not assignment-ready");
  }

  const requiredRoles = [...new Set(slots.map((slot) => slot.role))].sort();
  const rosterRoles = Object.keys(roster.reviewersByRole).sort();
  if (!sameStrings(rosterRoles, requiredRoles)) {
    throw new Error(
      `reviewersByRole must contain exactly: ${requiredRoles.join(", ")}`,
    );
  }

  const reviewerIds = requiredRoles.map((role) => {
    const reviewerId = roster.reviewersByRole[role];
    assertSafeHsk1ReviewId(reviewerId, `reviewersByRole.${role}`);
    return reviewerId;
  });
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    throw new Error("One reviewer cannot fill multiple roles in this unit roster");
  }

  const documents = await Promise.all(slots.map(async (slot, index) => {
    const assignmentId = assignmentIdFor(roster.assignmentPrefix, index);
    const document = await buildHsk1ReviewAssignmentDocument({
      root,
      assignmentId,
      batchId: slot.batchId,
      role: slot.role,
      assignedBy: roster.assignedBy,
      assignee: roster.reviewersByRole[slot.role],
      assignedAt: roster.assignedAt,
      nowEpochMs,
    });
    if (document.assignment.targetDigest !== slot.targetDigest) {
      throw new Error(
        `${slot.batchId}/${slot.role} no longer matches the reviewer packet`,
      );
    }
    return document;
  }));

  const slotKeys = documents.map((document) =>
    `${document.assignment.batchId}:${document.assignment.role}`
  );
  if (new Set(slotKeys).size !== slots.length) {
    throw new Error("HSK1 unit assignment set contains a duplicate review slot");
  }

  return {
    schemaVersion: 1,
    packetId: packet.packetId,
    packetSha256: packet.packetSha256,
    assignmentCount: documents.length,
    assignedBy: roster.assignedBy,
    assignedAt: roster.assignedAt,
    reviewerRoles: Object.fromEntries(requiredRoles.map((role) => [
      role,
      roster.reviewersByRole[role],
    ])),
    documents,
    policy: {
      localAssignmentsOnly: true,
      rosterDoesNotApproveReview: true,
      rosterDoesNotAuthorizeAudio: true,
      rosterDoesNotAuthorizeImport: true,
      grantsMeasurementOrMastery: false,
    },
  };
};
