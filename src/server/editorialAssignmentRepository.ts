import type {
  EditorialAssignmentEnvelope,
  ReviewRole,
  Sha256Digest,
} from "../content/types";
import { canonicalStringify, sha256Hex } from "../sync/canonicalHash";
import type { D1Database } from "./d1";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const WILDCARD_PATTERN = /[*?[\]]/u;
const REVIEW_ROLES = new Set<ReviewRole>([
  "content-owner",
  "native-linguistic",
  "source-license",
  "audio-rights",
]);
const ITEM_ONLY_ROLES = new Set<ReviewRole>([
  "content-owner",
  "source-license",
]);
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_TARGET_ID_LENGTH = 256;
const MAX_TARGETS = 10_000;
const MAX_STREAM_EVENTS = 10_000;
const MAX_DATE_EPOCH_MS = 8_640_000_000_000_000;
export const EDITORIAL_ASSIGNMENT_ENVELOPE_UTF8_LIMIT = 600_000;
export const EDITORIAL_ASSIGNMENT_EVENT_UTF8_LIMIT = 700_000;
export const EDITORIAL_ASSIGNMENT_STORED_JSON_UTF8_LIMIT = 1_350_000;
export const EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT =
  16 * 1024 * 1024;

export type EditorialContentStream = {
  contentVersion: string;
  packageManifestSha256: Sha256Digest;
  itemCatalogSha256: Sha256Digest;
};

export type EditorialAssignmentActor = {
  operatorId: string;
  credentialId: string;
};

export type EditorialAssignmentHead = {
  eventId: string;
  eventSha256: Sha256Digest;
  sequence: number;
};

export type EditorialAssignmentReference = {
  assignmentId: string;
  assignmentSha256: Sha256Digest;
};

type AppendBase = {
  actor: EditorialAssignmentActor;
  idempotencyKey: string;
  expectedHead: EditorialAssignmentHead | null;
};

export type AppendEditorialAssignmentCommand = AppendBase & {
  envelope: EditorialAssignmentEnvelope;
};

export type ReassignEditorialAssignmentCommand = AppendBase & {
  previousAssignment: EditorialAssignmentReference;
  envelope: EditorialAssignmentEnvelope;
};

export type CancelEditorialAssignmentCommand = AppendBase & {
  stream: EditorialContentStream;
  previousAssignment: EditorialAssignmentReference;
};

export type EditorialAssignmentEventType =
  | "assigned"
  | "reassigned"
  | "cancelled";

export type StoredEditorialAssignmentEvent = {
  schemaVersion: 1;
  eventId: string;
  streamId: Sha256Digest;
  sequence: number;
  eventType: EditorialAssignmentEventType;
  stream: EditorialContentStream;
  assignment: EditorialAssignmentEnvelope | null;
  assignmentSha256: Sha256Digest | null;
  previousAssignment: EditorialAssignmentReference | null;
  actor: EditorialAssignmentActor;
  idempotencyKey: string;
  requestSha256: Sha256Digest;
  previousEvent: EditorialAssignmentHead | null;
  targetCount: number;
  occurredAt: string;
  eventSha256: Sha256Digest;
};

export type EditorialAssignmentAppendReceipt =
  StoredEditorialAssignmentEvent & {
    duplicate: boolean;
  };

export type EditorialAssignmentStreamState = {
  streamId: Sha256Digest;
  head: EditorialAssignmentHead | null;
  events: readonly StoredEditorialAssignmentEvent[];
  activeAssignments: readonly {
    assignment: EditorialAssignmentEnvelope;
    assignmentSha256: Sha256Digest;
  }[];
};

export type EditorialAssignmentRepositoryOptions = {
  now?: () => number;
  eventId?: () => string;
};

export class EditorialAssignmentIntegrityError extends Error {
  readonly code = "EDITORIAL_ASSIGNMENT_INTEGRITY_ERROR";
}

export class EditorialAssignmentIdempotencyConflictError extends Error {
  readonly code = "EDITORIAL_ASSIGNMENT_IDEMPOTENCY_CONFLICT";
}

export class EditorialAssignmentHeadConflictError extends Error {
  readonly code = "EDITORIAL_ASSIGNMENT_HEAD_CONFLICT";
}

export class EditorialAssignmentTransitionConflictError extends Error {
  readonly code = "EDITORIAL_ASSIGNMENT_TRANSITION_CONFLICT";
}

export class EditorialAssignmentTargetConflictError extends Error {
  readonly code = "EDITORIAL_ASSIGNMENT_TARGET_CONFLICT";
}

export class EditorialAssignmentStorageError extends Error {
  readonly code = "EDITORIAL_ASSIGNMENT_STORAGE_ERROR";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EditorialAssignmentStorageError";
  }
}

type EventRow = {
  eventId: string;
  streamId: string;
  sequence: number;
  schemaVersion: number;
  eventType: string;
  contentVersion: string;
  packageManifestSha256: string;
  itemCatalogSha256: string;
  assignmentId: string | null;
  assignmentSha256: string | null;
  previousAssignmentId: string | null;
  previousAssignmentSha256: string | null;
  role: string | null;
  assigneeOperatorId: string | null;
  envelopeJson: string | null;
  targetCount: number;
  actorOperatorId: string;
  actorCredentialId: string;
  idempotencyKey: string;
  requestSha256: string;
  previousEventId: string | null;
  previousEventSha256: string | null;
  eventJson: string;
  eventSha256: string;
  occurredAt: number;
};

type ReplayState = {
  events: StoredEditorialAssignmentEvent[];
  active: Map<string, {
    assignment: EditorialAssignmentEnvelope;
    assignmentSha256: Sha256Digest;
  }>;
  seenAssignmentIds: Set<string>;
  targets: Map<string, string>;
  storedBytes: number;
};

type StreamStatsRow = {
  eventCount: number;
  storedBytes: number;
};

type PendingEvent = Omit<StoredEditorialAssignmentEvent, "eventSha256">;

const EVENT_COLUMNS = `
  event_id AS eventId,
  stream_id AS streamId,
  sequence,
  schema_version AS schemaVersion,
  event_type AS eventType,
  content_version AS contentVersion,
  package_manifest_sha256 AS packageManifestSha256,
  item_catalog_sha256 AS itemCatalogSha256,
  assignment_id AS assignmentId,
  assignment_sha256 AS assignmentSha256,
  previous_assignment_id AS previousAssignmentId,
  previous_assignment_sha256 AS previousAssignmentSha256,
  role,
  assignee_operator_id AS assigneeOperatorId,
  envelope_json AS envelopeJson,
  target_count AS targetCount,
  actor_operator_id AS actorOperatorId,
  actor_credential_id AS actorCredentialId,
  idempotency_key AS idempotencyKey,
  request_sha256 AS requestSha256,
  previous_event_id AS previousEventId,
  previous_event_sha256 AS previousEventSha256,
  event_json AS eventJson,
  event_sha256 AS eventSha256,
  occurred_at AS occurredAt`;

const STORED_EVENT_BYTES_SQL = `
  length(CAST(event_id AS BLOB))
  + length(CAST(stream_id AS BLOB))
  + length(CAST(event_type AS BLOB))
  + length(CAST(content_version AS BLOB))
  + length(CAST(package_manifest_sha256 AS BLOB))
  + length(CAST(item_catalog_sha256 AS BLOB))
  + COALESCE(length(CAST(assignment_id AS BLOB)), 0)
  + COALESCE(length(CAST(assignment_sha256 AS BLOB)), 0)
  + COALESCE(length(CAST(previous_assignment_id AS BLOB)), 0)
  + COALESCE(length(CAST(previous_assignment_sha256 AS BLOB)), 0)
  + COALESCE(length(CAST(role AS BLOB)), 0)
  + COALESCE(length(CAST(assignee_operator_id AS BLOB)), 0)
  + COALESCE(length(CAST(envelope_json AS BLOB)), 0)
  + length(CAST(actor_operator_id AS BLOB))
  + length(CAST(actor_credential_id AS BLOB))
  + length(CAST(idempotency_key AS BLOB))
  + length(CAST(request_sha256 AS BLOB))
  + COALESCE(length(CAST(previous_event_id AS BLOB)), 0)
  + COALESCE(length(CAST(previous_event_sha256 AS BLOB)), 0)
  + length(CAST(event_json AS BLOB))
  + length(CAST(event_sha256 AS BLOB))
  + 32`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength;

const assertStoredJsonBounds = (
  envelopeJson: string | null,
  eventJson?: string,
) => {
  const envelopeBytes = envelopeJson === null ? 0 : utf8Bytes(envelopeJson);
  if (envelopeBytes > EDITORIAL_ASSIGNMENT_ENVELOPE_UTF8_LIMIT) {
    throw new EditorialAssignmentIntegrityError(
      "Editorial assignment envelope exceeds the D1 UTF-8 safety bound.",
    );
  }
  if (eventJson === undefined) return;
  const eventBytes = utf8Bytes(eventJson);
  if (
    eventBytes > EDITORIAL_ASSIGNMENT_EVENT_UTF8_LIMIT
    || envelopeBytes + eventBytes
      > EDITORIAL_ASSIGNMENT_STORED_JSON_UTF8_LIMIT
  ) {
    throw new EditorialAssignmentIntegrityError(
      "Editorial assignment event exceeds the D1 row safety bound.",
    );
  }
};

const storedEventBytes = (
  event: StoredEditorialAssignmentEvent,
  envelopeJson: string | null,
  eventJson: string,
) => [
  event.eventId,
  event.streamId,
  event.eventType,
  event.stream.contentVersion,
  event.stream.packageManifestSha256,
  event.stream.itemCatalogSha256,
  event.assignment?.assignmentId ?? "",
  event.assignmentSha256 ?? "",
  event.previousAssignment?.assignmentId ?? "",
  event.previousAssignment?.assignmentSha256 ?? "",
  event.assignment?.role ?? "",
  event.assignment?.assigneeOperatorId ?? "",
  envelopeJson ?? "",
  event.actor.operatorId,
  event.actor.credentialId,
  event.idempotencyKey,
  event.requestSha256,
  event.previousEvent?.eventId ?? "",
  event.previousEvent?.eventSha256 ?? "",
  eventJson,
  event.eventSha256,
].reduce((total, value) => total + utf8Bytes(value), 32);

const digestCanonicalJson = async (
  canonicalJson: string,
): Promise<Sha256Digest> =>
  `sha256:${await sha256Hex(canonicalJson)}` as Sha256Digest;

const digest = async (value: unknown): Promise<Sha256Digest> =>
  digestCanonicalJson(canonicalStringify(value));

const assertSafeId = (value: unknown, label: string) => {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > MAX_IDENTIFIER_LENGTH
    || !SAFE_ID_PATTERN.test(value)
  ) {
    throw new EditorialAssignmentIntegrityError(`${label} is invalid.`);
  }
};

const assertDigest: (
  value: unknown,
  label: string,
) => asserts value is Sha256Digest = (value, label) => {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    throw new EditorialAssignmentIntegrityError(`${label} is invalid.`);
  }
};

const assertExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (canonicalStringify(actual) !== canonicalStringify(expected)) {
    throw new EditorialAssignmentIntegrityError(
      `${label} does not have the exact schema.`,
    );
  }
};

const assertCanonicalTargets = (
  value: unknown,
  label: string,
): string[] => {
  if (!Array.isArray(value)) {
    throw new EditorialAssignmentIntegrityError(`${label} must be an array.`);
  }
  const seen = new Set<string>();
  let previous: string | null = null;
  for (const target of value) {
    if (
      typeof target !== "string"
      || target.length < 1
      || target.length > MAX_TARGET_ID_LENGTH
      || WILDCARD_PATTERN.test(target)
      || seen.has(target)
      || (previous !== null && previous > target)
    ) {
      throw new EditorialAssignmentIntegrityError(
        `${label} is not a canonical exact target list.`,
      );
    }
    seen.add(target);
    previous = target;
  }
  return [...value] as string[];
};

const validateStream = (stream: EditorialContentStream) => {
  if (!isRecord(stream)) {
    throw new EditorialAssignmentIntegrityError("Content stream is invalid.");
  }
  assertExactKeys(
    stream,
    [
      "contentVersion",
      "packageManifestSha256",
      "itemCatalogSha256",
    ],
    "Content stream",
  );
  assertSafeId(stream.contentVersion, "Content version");
  assertDigest(stream.packageManifestSha256, "Package manifest digest");
  assertDigest(stream.itemCatalogSha256, "Item catalog digest");
};

const streamForEnvelope = (
  envelope: EditorialAssignmentEnvelope,
): EditorialContentStream => ({
  contentVersion: envelope.contentVersion,
  packageManifestSha256: envelope.packageManifestSha256,
  itemCatalogSha256: envelope.itemCatalogSha256,
});

export const editorialAssignmentStreamId = async (
  stream: EditorialContentStream,
): Promise<Sha256Digest> => {
  validateStream(stream);
  return digest(stream);
};

const validateActor = (actor: EditorialAssignmentActor) => {
  if (!isRecord(actor)) {
    throw new EditorialAssignmentIntegrityError("Editorial actor is invalid.");
  }
  assertExactKeys(actor, ["operatorId", "credentialId"], "Editorial actor");
  assertSafeId(actor.operatorId, "Editorial operator id");
  assertSafeId(actor.credentialId, "Editorial credential id");
};

const validateHead = (head: EditorialAssignmentHead | null) => {
  if (head === null) return;
  if (!isRecord(head)) {
    throw new EditorialAssignmentIntegrityError("Expected stream head is invalid.");
  }
  assertExactKeys(head, ["eventId", "eventSha256", "sequence"], "Expected head");
  assertSafeId(head.eventId, "Expected event id");
  assertDigest(head.eventSha256, "Expected event digest");
  if (!Number.isSafeInteger(head.sequence) || head.sequence < 1) {
    throw new EditorialAssignmentIntegrityError(
      "Expected event sequence is invalid.",
    );
  }
};

const validateReference = (reference: EditorialAssignmentReference) => {
  if (!isRecord(reference)) {
    throw new EditorialAssignmentIntegrityError(
      "Previous assignment reference is invalid.",
    );
  }
  assertExactKeys(
    reference,
    ["assignmentId", "assignmentSha256"],
    "Previous assignment reference",
  );
  assertSafeId(reference.assignmentId, "Previous assignment id");
  assertDigest(reference.assignmentSha256, "Previous assignment digest");
};

const validateEnvelope = (
  envelope: EditorialAssignmentEnvelope,
  actorOperatorId: string,
  now: number,
) => {
  if (!isRecord(envelope)) {
    throw new EditorialAssignmentIntegrityError(
      "Editorial assignment envelope is invalid.",
    );
  }
  assertExactKeys(
    envelope,
    [
      "schemaVersion",
      "assignmentId",
      "contentVersion",
      "packageManifestSha256",
      "itemCatalogSha256",
      "role",
      "assignedByOperatorId",
      "assigneeOperatorId",
      "assignedAt",
      "scope",
    ],
    "Editorial assignment envelope",
  );
  if (envelope.schemaVersion !== 1) {
    throw new EditorialAssignmentIntegrityError(
      "Editorial assignment schema version is invalid.",
    );
  }
  assertSafeId(envelope.assignmentId, "Assignment id");
  validateStream(streamForEnvelope(envelope));
  if (!REVIEW_ROLES.has(envelope.role)) {
    throw new EditorialAssignmentIntegrityError("Assignment role is invalid.");
  }
  assertSafeId(envelope.assignedByOperatorId, "Assigning operator id");
  assertSafeId(envelope.assigneeOperatorId, "Assignee operator id");
  if (envelope.assignedByOperatorId !== actorOperatorId) {
    throw new EditorialAssignmentIntegrityError(
      "Authenticated actor does not match the assigning operator.",
    );
  }
  const assignedAt = Date.parse(envelope.assignedAt);
  if (
    !Number.isFinite(assignedAt)
    || new Date(assignedAt).toISOString() !== envelope.assignedAt
    || assignedAt > now
  ) {
    throw new EditorialAssignmentIntegrityError(
      "Assignment timestamp is invalid.",
    );
  }
  if (!isRecord(envelope.scope)) {
    throw new EditorialAssignmentIntegrityError("Assignment scope is invalid.");
  }
  assertExactKeys(
    envelope.scope,
    ["itemKeys", "audioAssetIds"],
    "Editorial assignment scope",
  );
  const itemKeys = assertCanonicalTargets(
    envelope.scope.itemKeys,
    "Assignment item targets",
  );
  const audioAssetIds = assertCanonicalTargets(
    envelope.scope.audioAssetIds,
    "Assignment audio targets",
  );
  const targetCount = itemKeys.length + audioAssetIds.length;
  if (targetCount < 1 || targetCount > MAX_TARGETS) {
    throw new EditorialAssignmentIntegrityError(
      "Assignment target count is invalid.",
    );
  }
  if (
    ITEM_ONLY_ROLES.has(envelope.role)
    && (itemKeys.length === 0 || audioAssetIds.length !== 0)
  ) {
    throw new EditorialAssignmentIntegrityError(
      "Item-only assignment scope is invalid.",
    );
  }
  if (
    envelope.role === "audio-rights"
    && (itemKeys.length !== 0 || audioAssetIds.length === 0)
  ) {
    throw new EditorialAssignmentIntegrityError(
      "Audio-rights assignment scope is invalid.",
    );
  }
  if (envelope.role === "native-linguistic" && itemKeys.length === 0) {
    throw new EditorialAssignmentIntegrityError(
      "Native-linguistic assignment requires item targets.",
    );
  }
  return targetCount;
};

const headFor = (
  event: StoredEditorialAssignmentEvent | undefined,
): EditorialAssignmentHead | null => event
  ? {
      eventId: event.eventId,
      eventSha256: event.eventSha256,
      sequence: event.sequence,
    }
  : null;

const sameHead = (
  left: EditorialAssignmentHead | null,
  right: EditorialAssignmentHead | null,
) => canonicalStringify(left) === canonicalStringify(right);

const targetKeys = (envelope: EditorialAssignmentEnvelope) => [
  ...envelope.scope.itemKeys.map((id) => `${envelope.role}\u0000item\u0000${id}`),
  ...envelope.scope.audioAssetIds.map(
    (id) => `${envelope.role}\u0000audio\u0000${id}`,
  ),
];

const assignmentIntent = (envelope: EditorialAssignmentEnvelope | null) =>
  envelope === null
    ? null
    : {
        assignmentId: envelope.assignmentId,
        role: envelope.role,
        assigneeOperatorId: envelope.assigneeOperatorId,
        scope: envelope.scope,
      };

const requestIntent = (
  eventType: EditorialAssignmentEventType,
  actorOperatorId: string,
  idempotencyKey: string,
  expectedHead: EditorialAssignmentHead | null,
  stream: EditorialContentStream,
  previousAssignment: EditorialAssignmentReference | null,
  envelope: EditorialAssignmentEnvelope | null,
) => ({
  schemaVersion: 1,
  eventType,
  actorOperatorId,
  idempotencyKey,
  expectedHead,
  stream,
  previousAssignment,
  assignment: assignmentIntent(envelope),
});

const eventJsonValue = (event: PendingEvent) => ({
  schemaVersion: event.schemaVersion,
  eventId: event.eventId,
  streamId: event.streamId,
  sequence: event.sequence,
  eventType: event.eventType,
  stream: event.stream,
  assignment: event.assignment,
  assignmentSha256: event.assignmentSha256,
  previousAssignment: event.previousAssignment,
  actor: event.actor,
  idempotencyKey: event.idempotencyKey,
  requestSha256: event.requestSha256,
  previousEvent: event.previousEvent,
  targetCount: event.targetCount,
  occurredAt: event.occurredAt,
});

const parseEnvelope = (raw: string | null): EditorialAssignmentEnvelope | null => {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EditorialAssignmentIntegrityError(
      "Stored assignment envelope is not JSON.",
    );
  }
  if (!isRecord(parsed)) {
    throw new EditorialAssignmentIntegrityError(
      "Stored assignment envelope is invalid.",
    );
  }
  return parsed as EditorialAssignmentEnvelope;
};

const rowToPendingEvent = (
  row: EventRow,
  envelope: EditorialAssignmentEnvelope | null,
): PendingEvent => ({
  schemaVersion: row.schemaVersion as 1,
  eventId: row.eventId,
  streamId: row.streamId as Sha256Digest,
  sequence: row.sequence,
  eventType: row.eventType as EditorialAssignmentEventType,
  stream: {
    contentVersion: row.contentVersion,
    packageManifestSha256: row.packageManifestSha256 as Sha256Digest,
    itemCatalogSha256: row.itemCatalogSha256 as Sha256Digest,
  },
  assignment: envelope,
  assignmentSha256: row.assignmentSha256 as Sha256Digest | null,
  previousAssignment: row.previousAssignmentId === null
    ? null
    : {
        assignmentId: row.previousAssignmentId,
        assignmentSha256: row.previousAssignmentSha256 as Sha256Digest,
      },
  actor: {
    operatorId: row.actorOperatorId,
    credentialId: row.actorCredentialId,
  },
  idempotencyKey: row.idempotencyKey,
  requestSha256: row.requestSha256 as Sha256Digest,
  previousEvent: row.previousEventId === null
    ? null
    : {
        eventId: row.previousEventId,
        eventSha256: row.previousEventSha256 as Sha256Digest,
        sequence: row.sequence - 1,
      },
  targetCount: row.targetCount,
  occurredAt: new Date(row.occurredAt).toISOString(),
});

const copyEvent = (
  event: StoredEditorialAssignmentEvent,
): StoredEditorialAssignmentEvent =>
  JSON.parse(canonicalStringify(event)) as StoredEditorialAssignmentEvent;

export class EditorialAssignmentRepository {
  private readonly now: () => number;
  private readonly eventId: () => string;

  constructor(
    private readonly database: D1Database,
    options: EditorialAssignmentRepositoryOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.eventId = options.eventId ?? crypto.randomUUID;
  }

  async appendAssigned(
    command: AppendEditorialAssignmentCommand,
  ): Promise<EditorialAssignmentAppendReceipt> {
    return this.append("assigned", command);
  }

  async reassign(
    command: ReassignEditorialAssignmentCommand,
  ): Promise<EditorialAssignmentAppendReceipt> {
    return this.append("reassigned", command);
  }

  async cancel(
    command: CancelEditorialAssignmentCommand,
  ): Promise<EditorialAssignmentAppendReceipt> {
    return this.append("cancelled", command);
  }

  async list(
    stream: EditorialContentStream,
  ): Promise<EditorialAssignmentStreamState> {
    const streamId = await editorialAssignmentStreamId(stream);
    const replay = await this.readAndReplay(streamId, stream);
    return {
      streamId,
      head: headFor(replay.events.at(-1)),
      events: replay.events.map(copyEvent),
      activeAssignments: [...replay.active.values()].map((entry) => ({
        assignment: JSON.parse(
          canonicalStringify(entry.assignment),
        ) as EditorialAssignmentEnvelope,
        assignmentSha256: entry.assignmentSha256,
      })),
    };
  }

  async read(eventId: string): Promise<StoredEditorialAssignmentEvent | null> {
    assertSafeId(eventId, "Editorial event id");
    const row = await this.database.prepare(
      `SELECT ${EVENT_COLUMNS}
       FROM editorial_assignment_events
       WHERE event_id = ?
       LIMIT 1`,
    ).bind(eventId).first<EventRow>();
    if (!row) return null;
    assertDigest(row.streamId, "Stored stream digest");
    const replay = await this.readAndReplay(row.streamId);
    const event = replay.events.find((candidate) =>
      candidate.eventId === eventId
    );
    if (!event) {
      throw new EditorialAssignmentIntegrityError(
        "Stored editorial event is missing from its stream.",
      );
    }
    return copyEvent(event);
  }

  private async append(
    eventType: EditorialAssignmentEventType,
    command:
      | AppendEditorialAssignmentCommand
      | ReassignEditorialAssignmentCommand
      | CancelEditorialAssignmentCommand,
  ): Promise<EditorialAssignmentAppendReceipt> {
    if (!isRecord(command)) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial assignment command is invalid.",
      );
    }
    validateActor(command.actor);
    assertSafeId(command.idempotencyKey, "Editorial idempotency key");
    validateHead(command.expectedHead);
    const timestamp = this.now();
    if (
      !Number.isSafeInteger(timestamp)
      || timestamp < 0
      || timestamp > MAX_DATE_EPOCH_MS
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial repository clock is invalid.",
      );
    }

    const envelope = "envelope" in command ? command.envelope : null;
    let stream: EditorialContentStream;
    if (envelope) {
      stream = streamForEnvelope(envelope);
    } else if ("stream" in command) {
      stream = command.stream;
    } else {
      throw new EditorialAssignmentIntegrityError(
        "Editorial cancellation stream is missing.",
      );
    }
    validateStream(stream);
    const targetCount = envelope
      ? validateEnvelope(envelope, command.actor.operatorId, timestamp)
      : 0;
    const envelopeJson = envelope === null
      ? null
      : canonicalStringify(envelope);
    assertStoredJsonBounds(envelopeJson);
    const previousAssignment = "previousAssignment" in command
      ? command.previousAssignment
      : null;
    if (previousAssignment) validateReference(previousAssignment);
    if (
      eventType === "assigned" && previousAssignment !== null
      || eventType !== "assigned" && previousAssignment === null
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial assignment transition shape is invalid.",
      );
    }

    const requestValue = requestIntent(
      eventType,
      command.actor.operatorId,
      command.idempotencyKey,
      command.expectedHead,
      stream,
      previousAssignment,
      envelope,
    );
    const requestSha256 = await digest(requestValue);
    const existing = await this.findByIdempotency(
      command.actor.operatorId,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveIdempotent(existing, requestSha256);
    }

    const streamId = await editorialAssignmentStreamId(stream);
    const replay = await this.readAndReplay(streamId, stream);
    const replayWinner = await this.findByIdempotency(
      command.actor.operatorId,
      command.idempotencyKey,
    );
    if (replayWinner) {
      return this.resolveIdempotent(replayWinner, requestSha256);
    }
    const currentHead = headFor(replay.events.at(-1));
    if (!sameHead(currentHead, command.expectedHead)) {
      throw new EditorialAssignmentHeadConflictError(
        "Editorial assignment stream head changed.",
      );
    }
    if ((currentHead?.sequence ?? 0) >= MAX_STREAM_EVENTS) {
      throw new EditorialAssignmentHeadConflictError(
        "Editorial assignment stream reached its bounded replay limit.",
      );
    }
    this.validateTransition(
      replay,
      eventType,
      previousAssignment,
      envelope,
    );

    const assignmentSha256 = envelope ? await digest(envelope) : null;
    const eventId = this.eventId();
    assertSafeId(eventId, "Generated editorial event id");
    const pending: PendingEvent = {
      schemaVersion: 1,
      eventId,
      streamId,
      sequence: (currentHead?.sequence ?? 0) + 1,
      eventType,
      stream,
      assignment: envelope
        ? JSON.parse(canonicalStringify(envelope)) as EditorialAssignmentEnvelope
        : null,
      assignmentSha256,
      previousAssignment,
      actor: { ...command.actor },
      idempotencyKey: command.idempotencyKey,
      requestSha256,
      previousEvent: currentHead,
      targetCount,
      occurredAt: new Date(timestamp).toISOString(),
    };
    const eventJson = canonicalStringify(eventJsonValue(pending));
    assertStoredJsonBounds(envelopeJson, eventJson);
    const eventSha256 = await digestCanonicalJson(eventJson);
    const event: StoredEditorialAssignmentEvent = {
      ...pending,
      eventSha256,
    };
    if (
      replay.storedBytes + storedEventBytes(event, envelopeJson, eventJson)
        > EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial assignment stream exceeds its stored-byte replay bound.",
      );
    }

    const statements = [
      this.database.prepare(
        `INSERT INTO editorial_assignment_events (
          event_id, stream_id, sequence, schema_version, event_type,
          content_version, package_manifest_sha256, item_catalog_sha256,
          assignment_id, assignment_sha256, previous_assignment_id,
          previous_assignment_sha256, role, assignee_operator_id,
          envelope_json, target_count, actor_operator_id,
          actor_credential_id, idempotency_key, request_sha256,
          previous_event_id, previous_event_sha256, event_json, event_sha256,
          occurred_at
        )
        SELECT ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?
        WHERE (
          ? = 1
          AND ? IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM editorial_assignment_events
            WHERE stream_id = ?
          )
        ) OR (
          ? > 1
          AND EXISTS (
            SELECT 1
            FROM editorial_assignment_events predecessor
            WHERE predecessor.stream_id = ?
              AND predecessor.event_id = ?
              AND predecessor.event_sha256 = ?
              AND predecessor.sequence = ? - 1
              AND NOT EXISTS (
                SELECT 1
                FROM editorial_assignment_events successor
                WHERE successor.stream_id = predecessor.stream_id
                  AND successor.previous_event_id = predecessor.event_id
              )
          )
        )`,
      ).bind(
        event.eventId,
        event.streamId,
        event.sequence,
        event.eventType,
        event.stream.contentVersion,
        event.stream.packageManifestSha256,
        event.stream.itemCatalogSha256,
        event.assignment?.assignmentId ?? null,
        event.assignmentSha256,
        event.previousAssignment?.assignmentId ?? null,
        event.previousAssignment?.assignmentSha256 ?? null,
        event.assignment?.role ?? null,
        event.assignment?.assigneeOperatorId ?? null,
        envelopeJson,
        event.targetCount,
        event.actor.operatorId,
        event.actor.credentialId,
        event.idempotencyKey,
        event.requestSha256,
        event.previousEvent?.eventId ?? null,
        event.previousEvent?.eventSha256 ?? null,
        eventJson,
        event.eventSha256,
        timestamp,
        event.sequence,
        event.previousEvent?.eventId ?? null,
        event.streamId,
        event.sequence,
        event.streamId,
        event.previousEvent?.eventId ?? null,
        event.previousEvent?.eventSha256 ?? null,
        event.sequence,
      ),
      this.database.prepare(
        `SELECT ${EVENT_COLUMNS}
         FROM editorial_assignment_events
         WHERE event_id = ?
         LIMIT 1`,
      ).bind(event.eventId),
    ];

    let appendError: unknown = null;
    try {
      const results = await this.database.batch<EventRow>(statements);
      const inserted = results[1]?.results ?? [];
      if (inserted.length === 1) {
        const stored = await this.verifyRow(inserted[0]);
        if (canonicalStringify(stored) !== canonicalStringify(event)) {
          throw new EditorialAssignmentIntegrityError(
            "Inserted editorial event did not round-trip exactly.",
          );
        }
        return { ...copyEvent(stored), duplicate: false };
      }
    } catch (error) {
      appendError = error;
    }

    const winner = await this.findByIdempotency(
      command.actor.operatorId,
      command.idempotencyKey,
    );
    if (winner) return this.resolveIdempotent(winner, requestSha256);
    const after = await this.readAndReplay(streamId, stream);
    const afterHead = headFor(after.events.at(-1));
    if (!sameHead(afterHead, currentHead)) {
      this.validateTransition(
        after,
        eventType,
        previousAssignment,
        envelope,
      );
      throw new EditorialAssignmentHeadConflictError(
        "Editorial assignment stream compare-and-swap failed.",
      );
    }
    if (
      appendError instanceof EditorialAssignmentIntegrityError
      || appendError instanceof EditorialAssignmentTargetConflictError
      || appendError instanceof EditorialAssignmentTransitionConflictError
    ) {
      throw appendError;
    }
    throw new EditorialAssignmentStorageError(
      "Editorial assignment append failed without a committed winner.",
      appendError === null ? undefined : { cause: appendError },
    );
  }

  private validateTransition(
    replay: ReplayState,
    eventType: EditorialAssignmentEventType,
    previousAssignment: EditorialAssignmentReference | null,
    envelope: EditorialAssignmentEnvelope | null,
  ) {
    if (eventType !== "assigned") {
      const previous = previousAssignment
        ? replay.active.get(previousAssignment.assignmentId)
        : null;
      if (
        !previous
        || previous.assignmentSha256 !== previousAssignment?.assignmentSha256
      ) {
        throw new EditorialAssignmentTransitionConflictError(
          "Previous editorial assignment is not active at the exact digest.",
        );
      }
    }
    if (!envelope) return;
    if (
      replay.seenAssignmentIds.has(envelope.assignmentId)
      || envelope.assignmentId === previousAssignment?.assignmentId
    ) {
      throw new EditorialAssignmentTransitionConflictError(
        "New editorial assignment id has already been used.",
      );
    }
    for (const target of targetKeys(envelope)) {
      const owner = replay.targets.get(target);
      if (owner && owner !== previousAssignment?.assignmentId) {
        throw new EditorialAssignmentTargetConflictError(
          "Editorial role/target is already assigned.",
        );
      }
    }
  }

  private async resolveIdempotent(
    row: EventRow,
    requestSha256: Sha256Digest,
  ): Promise<EditorialAssignmentAppendReceipt> {
    const event = await this.read(row.eventId);
    if (!event) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial idempotency winner is unreadable.",
      );
    }
    if (event.requestSha256 !== requestSha256) {
      throw new EditorialAssignmentIdempotencyConflictError(
        "Editorial idempotency key belongs to a different request.",
      );
    }
    return { ...event, duplicate: true };
  }

  private async findByIdempotency(
    actorOperatorId: string,
    idempotencyKey: string,
  ): Promise<EventRow | null> {
    return this.database.prepare(
      `SELECT ${EVENT_COLUMNS}
       FROM editorial_assignment_events
       WHERE actor_operator_id = ?
         AND idempotency_key = ?
       LIMIT 1`,
    ).bind(actorOperatorId, idempotencyKey).first<EventRow>();
  }

  private async readAndReplay(
    streamId: Sha256Digest,
    expectedStream?: EditorialContentStream,
    readAttempt = 0,
  ): Promise<ReplayState> {
    const stats = await this.database.prepare(
      `SELECT
         COUNT(*) AS eventCount,
         COALESCE(SUM(${STORED_EVENT_BYTES_SQL}), 0) AS storedBytes
       FROM editorial_assignment_events
       WHERE stream_id = ?`,
    ).bind(streamId).first<StreamStatsRow>();
    if (
      !stats
      || !Number.isSafeInteger(stats.eventCount)
      || stats.eventCount < 0
      || stats.eventCount > MAX_STREAM_EVENTS
      || !Number.isSafeInteger(stats.storedBytes)
      || stats.storedBytes < 0
      || stats.storedBytes
        > EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial assignment stream exceeds its bounded read budget.",
      );
    }
    const result = await this.database.prepare(
      `SELECT ${EVENT_COLUMNS}
       FROM editorial_assignment_events
       WHERE stream_id = ?
         AND (
           SELECT COUNT(*)
           FROM editorial_assignment_events
           WHERE stream_id = ?
         ) <= ?
         AND (
           SELECT COALESCE(SUM(${STORED_EVENT_BYTES_SQL}), 0)
           FROM editorial_assignment_events
           WHERE stream_id = ?
         ) <= ?
       ORDER BY sequence ASC
       LIMIT ?`,
    ).bind(
      streamId,
      streamId,
      MAX_STREAM_EVENTS,
      streamId,
      EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT,
      MAX_STREAM_EVENTS + 1,
    ).all<EventRow>();
    if (!result.success || !Array.isArray(result.results)) {
      throw new EditorialAssignmentIntegrityError(
        "Editorial assignment stream could not be read.",
      );
    }
    if (result.results.length !== stats.eventCount) {
      if (readAttempt < 2) {
        return this.readAndReplay(streamId, expectedStream, readAttempt + 1);
      }
      throw new EditorialAssignmentIntegrityError(
        "Editorial assignment stream changed during its bounded read.",
      );
    }
    const replay: ReplayState = {
      events: [],
      active: new Map(),
      seenAssignmentIds: new Set(),
      targets: new Map(),
      storedBytes: stats.storedBytes,
    };
    for (const row of result.results) {
      const event = await this.verifyRow(row);
      if (event.streamId !== streamId) {
        throw new EditorialAssignmentIntegrityError(
          "Editorial event belongs to the wrong stream.",
        );
      }
      if (
        expectedStream
        && canonicalStringify(event.stream) !== canonicalStringify(expectedStream)
      ) {
        throw new EditorialAssignmentIntegrityError(
          "Editorial stream content binding is inconsistent.",
        );
      }
      const expectedHead = headFor(replay.events.at(-1));
      if (
        event.sequence !== replay.events.length + 1
        || !sameHead(event.previousEvent, expectedHead)
        || (event.sequence === 1 && event.eventType !== "assigned")
      ) {
        throw new EditorialAssignmentIntegrityError(
          "Editorial assignment event chain is forked or incomplete.",
        );
      }
      this.applyReplayedEvent(replay, event);
      replay.events.push(event);
    }
    return replay;
  }

  private applyReplayedEvent(
    replay: ReplayState,
    event: StoredEditorialAssignmentEvent,
  ) {
    if (event.previousAssignment) {
      const previous = replay.active.get(
        event.previousAssignment.assignmentId,
      );
      if (
        !previous
        || previous.assignmentSha256
          !== event.previousAssignment.assignmentSha256
      ) {
        throw new EditorialAssignmentIntegrityError(
          "Editorial event transitions an inactive assignment.",
        );
      }
      for (const target of targetKeys(previous.assignment)) {
        if (replay.targets.get(target) !== previous.assignment.assignmentId) {
          throw new EditorialAssignmentIntegrityError(
            "Editorial active target map is inconsistent.",
          );
        }
        replay.targets.delete(target);
      }
      replay.active.delete(previous.assignment.assignmentId);
    }
    if (event.assignment && event.assignmentSha256) {
      if (replay.seenAssignmentIds.has(event.assignment.assignmentId)) {
        throw new EditorialAssignmentIntegrityError(
          "Editorial assignment id is duplicated.",
        );
      }
      for (const target of targetKeys(event.assignment)) {
        if (replay.targets.has(target)) {
          throw new EditorialAssignmentIntegrityError(
            "Editorial event overlaps an active role/target.",
          );
        }
        replay.targets.set(target, event.assignment.assignmentId);
      }
      replay.active.set(event.assignment.assignmentId, {
        assignment: event.assignment,
        assignmentSha256: event.assignmentSha256,
      });
      replay.seenAssignmentIds.add(event.assignment.assignmentId);
    }
  }

  private async verifyRow(
    row: EventRow,
  ): Promise<StoredEditorialAssignmentEvent> {
    if (
      !isRecord(row)
      || row.schemaVersion !== 1
      || !Number.isSafeInteger(row.sequence)
      || row.sequence < 1
      || row.sequence > MAX_STREAM_EVENTS
      || !Number.isSafeInteger(row.occurredAt)
      || row.occurredAt < 0
      || row.occurredAt > MAX_DATE_EPOCH_MS
      || !Number.isSafeInteger(row.targetCount)
      || row.targetCount < 0
      || row.targetCount > MAX_TARGETS
      || !["assigned", "reassigned", "cancelled"].includes(row.eventType)
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Stored editorial event columns are invalid.",
      );
    }
    assertSafeId(row.eventId, "Stored event id");
    validateActor({
      operatorId: row.actorOperatorId,
      credentialId: row.actorCredentialId,
    });
    assertSafeId(row.idempotencyKey, "Stored idempotency key");
    assertDigest(row.streamId, "Stored stream digest");
    assertDigest(row.packageManifestSha256, "Stored manifest digest");
    assertDigest(row.itemCatalogSha256, "Stored catalog digest");
    assertDigest(row.requestSha256, "Stored request digest");
    assertDigest(row.eventSha256, "Stored event digest");
    assertStoredJsonBounds(row.envelopeJson, row.eventJson);
    const envelope = parseEnvelope(row.envelopeJson);
    if (envelope) {
      const count = validateEnvelope(
        envelope,
        row.actorOperatorId,
        row.occurredAt,
      );
      if (
        count !== row.targetCount
        || row.assignmentId !== envelope.assignmentId
        || row.role !== envelope.role
        || row.assigneeOperatorId !== envelope.assigneeOperatorId
      ) {
        throw new EditorialAssignmentIntegrityError(
          "Stored assignment columns do not match the envelope.",
        );
      }
      assertDigest(row.assignmentSha256, "Stored assignment digest");
      if (
        await digest(envelope) !== row.assignmentSha256
        || canonicalStringify(envelope) !== row.envelopeJson
      ) {
        throw new EditorialAssignmentIntegrityError(
          "Stored assignment envelope digest is invalid.",
        );
      }
    } else if (
      row.assignmentId !== null
      || row.assignmentSha256 !== null
      || row.role !== null
      || row.assigneeOperatorId !== null
      || row.targetCount !== 0
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Stored cancellation has assignment payload columns.",
      );
    }
    if (
      row.eventType === "assigned"
        && (envelope === null || row.previousAssignmentId !== null)
      || row.eventType === "reassigned"
        && (envelope === null || row.previousAssignmentId === null)
      || row.eventType === "cancelled"
        && (envelope !== null || row.previousAssignmentId === null)
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Stored editorial event transition shape is invalid.",
      );
    }
    if (row.previousAssignmentId === null) {
      if (row.previousAssignmentSha256 !== null) {
        throw new EditorialAssignmentIntegrityError(
          "Stored previous assignment reference is partial.",
        );
      }
    } else {
      assertSafeId(row.previousAssignmentId, "Stored previous assignment id");
      assertDigest(
        row.previousAssignmentSha256,
        "Stored previous assignment digest",
      );
    }
    if (row.previousEventId === null) {
      if (row.previousEventSha256 !== null || row.sequence !== 1) {
        throw new EditorialAssignmentIntegrityError(
          "Stored predecessor reference is partial.",
        );
      }
    } else {
      assertSafeId(row.previousEventId, "Stored predecessor event id");
      assertDigest(row.previousEventSha256, "Stored predecessor event digest");
    }
    const pending = rowToPendingEvent(row, envelope);
    const expectedStreamId = await editorialAssignmentStreamId(pending.stream);
    if (expectedStreamId !== pending.streamId) {
      throw new EditorialAssignmentIntegrityError(
        "Stored editorial stream digest is invalid.",
      );
    }
    const expectedRequestSha256 = await digest(requestIntent(
      pending.eventType,
      pending.actor.operatorId,
      pending.idempotencyKey,
      pending.previousEvent,
      pending.stream,
      pending.previousAssignment,
      pending.assignment,
    ));
    if (expectedRequestSha256 !== pending.requestSha256) {
      throw new EditorialAssignmentIntegrityError(
        "Stored editorial request digest is invalid.",
      );
    }
    const expectedJson = canonicalStringify(eventJsonValue(pending));
    if (
      row.eventJson !== expectedJson
      || await digestCanonicalJson(row.eventJson) !== row.eventSha256
    ) {
      throw new EditorialAssignmentIntegrityError(
        "Stored editorial event canonical digest is invalid.",
      );
    }
    return { ...pending, eventSha256: row.eventSha256 as Sha256Digest };
  }
}
