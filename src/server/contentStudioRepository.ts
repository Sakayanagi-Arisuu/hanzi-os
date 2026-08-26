import {
  canonicalStudioJson,
  isStudioItemType,
  isStudioLevel,
  isStudioWorkflowState,
  studioSha256,
  validateStudioContent,
  type StudioItemType,
  type StudioLevel,
  type StudioValidationResult,
  type StudioWorkflowState,
} from "../content/studioContent";
import { AuditRepository } from "./auditRepository";
import { encodeContentReleaseEvent } from "./contentReleaseEventContract";
import type { EncodedContentReleaseEvent } from "./contentReleaseEventContract";
import { contentReleaseEventInsertStatement } from "./contentReleaseWorker";
import type { D1Database, D1PreparedStatement } from "./d1";

export class ContentStudioConcurrencyError extends Error {
  readonly code = "CONTENT_REVISION_CONFLICT";
}

export class ContentStudioTransitionError extends Error {
  readonly code = "CONTENT_TRANSITION_REJECTED";
}

export class ContentStudioNotFoundError extends Error {
  readonly code = "CONTENT_REVISION_NOT_FOUND";
}

export class ContentStudioIdempotencyError extends Error {
  readonly code = "CONTENT_IDEMPOTENCY_CONFLICT";
}

export type StudioRevision = {
  id: string;
  itemId: string;
  stableKey: string;
  itemType: StudioItemType;
  revision: number;
  schemaVersion: 1;
  workflowState: StudioWorkflowState;
  title: string;
  level: StudioLevel;
  content: Record<string, unknown>;
  contentSha256: string;
  validation: StudioValidationResult | null;
  validationSha256: string | null;
  basedOnRevisionId: string | null;
  rowVersion: number;
  authorUserId: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  archivedAt: number | null;
};

export type StudioWorkflowEvent = {
  id: string;
  itemId: string;
  revisionId: string;
  sequence: number;
  fromState: StudioWorkflowState | null;
  toState: StudioWorkflowState;
  actorUserId: string;
  actorSessionId: string | null;
  idempotencyKey: string;
  requestSha256: string;
  metadata: Record<string, unknown>;
  occurredAt: number;
};

export type PublishedStudioRuntimeItem = {
  stableKey: string;
  itemType: StudioItemType;
  level: StudioLevel;
  title: string;
  revision: number;
  revisionId: string;
  schemaVersion: 1;
  contentSha256: string;
  publishedAt: number;
  content: Record<string, unknown>;
};

type RevisionRow = Omit<StudioRevision, "content" | "validation"> & {
  contentJson: string;
  validationJson: string | null;
};

const REVISION_SELECT = `SELECT r.id,
       r.item_id AS itemId,
       i.stable_key AS stableKey,
       i.item_type AS itemType,
       r.revision,
       r.schema_version AS schemaVersion,
       r.workflow_state AS workflowState,
       r.title,
       r.level,
       r.content_json AS contentJson,
       r.content_sha256 AS contentSha256,
       r.validation_json AS validationJson,
       r.validation_sha256 AS validationSha256,
       r.based_on_revision_id AS basedOnRevisionId,
       r.row_version AS rowVersion,
       r.author_user_id AS authorUserId,
       r.created_at AS createdAt,
       r.updated_at AS updatedAt,
       r.published_at AS publishedAt,
       r.archived_at AS archivedAt
  FROM content_revisions r
  INNER JOIN content_items i ON i.id = r.item_id`;

const parseRevision = (row: RevisionRow): StudioRevision => {
  if (
    !isStudioItemType(row.itemType)
    || !isStudioLevel(row.level)
    || !isStudioWorkflowState(row.workflowState)
  ) {
    throw new Error("Stored Studio revision has invalid governed metadata.");
  }
  return {
    ...row,
    schemaVersion: 1,
    content: JSON.parse(row.contentJson) as Record<string, unknown>,
    validation: row.validationJson
      ? JSON.parse(row.validationJson) as StudioValidationResult
      : null,
  };
};

const validStableKey = (value: string) =>
  /^[a-z0-9][a-z0-9._:-]{2,159}$/u.test(value);

const validIdempotencyKey = (value: string) =>
  /^[A-Za-z0-9._:-]{8,160}$/u.test(value);

const assertMutationIdentity = (input: {
  actorUserId: string;
  idempotencyKey: string;
}) => {
  if (!input.actorUserId.trim() || !validIdempotencyKey(input.idempotencyKey)) {
    throw new TypeError("Actor or idempotency key is invalid.");
  }
};

const requestDigest = async (value: unknown) =>
  studioSha256(canonicalStudioJson(value));

const nextEventSequence = async (
  database: D1Database,
  revisionId: string,
) => {
  const row = await database.prepare(
    "SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM content_workflow_events WHERE revision_id = ?",
  ).bind(revisionId).first<{ sequence: number }>();
  return row?.sequence ?? 1;
};

const eventStatement = (
  database: D1Database,
  input: {
    id: string;
    itemId: string;
    revisionId: string;
    sequence: number;
    fromState: StudioWorkflowState | null;
    toState: StudioWorkflowState;
    actorUserId: string;
    actorSessionId: string | null;
    idempotencyKey: string;
    requestSha256: string;
    metadata: Record<string, unknown>;
    occurredAt: number;
    requiredRowVersion: number;
  },
) => database.prepare(
  `INSERT INTO content_workflow_events (
    id, item_id, revision_id, sequence, from_state, to_state,
    actor_user_id, actor_session_id, idempotency_key, request_sha256,
    metadata_json, occurred_at
  ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM content_revisions
       WHERE id = ? AND row_version = ? AND workflow_state = ?
    )`,
).bind(
  input.id,
  input.itemId,
  input.revisionId,
  input.sequence,
  input.fromState,
  input.toState,
  input.actorUserId,
  input.actorSessionId,
  input.idempotencyKey,
  input.requestSha256,
  canonicalStudioJson(input.metadata),
  input.occurredAt,
  input.revisionId,
  input.requiredRowVersion,
  input.toState,
);

export class ContentStudioRepository {
  constructor(private readonly database: D1Database) {}

  async list(input: {
    itemType?: StudioItemType | null;
    state?: StudioWorkflowState | null;
    level?: StudioLevel | null;
    limit?: number;
  } = {}): Promise<StudioRevision[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.itemType) {
      clauses.push("i.item_type = ?");
      values.push(input.itemType);
    }
    if (input.state) {
      clauses.push("r.workflow_state = ?");
      values.push(input.state);
    }
    if (input.level) {
      clauses.push("r.level = ?");
      values.push(input.level);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 100)));
    const result = await this.database.prepare(
      `${REVISION_SELECT} ${where}
       ORDER BY r.updated_at DESC, r.item_id, r.revision DESC LIMIT ?`,
    ).bind(...values, limit).all<RevisionRow>();
    if (!result.success) throw new Error("Unable to list Studio revisions.");
    return (result.results ?? []).map(parseRevision);
  }

  async getRevision(revisionId: string): Promise<StudioRevision> {
    const row = await this.database.prepare(
      `${REVISION_SELECT} WHERE r.id = ? LIMIT 1`,
    ).bind(revisionId).first<RevisionRow>();
    if (!row) throw new ContentStudioNotFoundError("Content revision was not found.");
    return parseRevision(row);
  }

  async getLatestRevision(itemId: string): Promise<StudioRevision> {
    const row = await this.database.prepare(
      `${REVISION_SELECT} WHERE r.item_id = ?
       ORDER BY r.revision DESC LIMIT 1`,
    ).bind(itemId).first<RevisionRow>();
    if (!row) throw new ContentStudioNotFoundError("Content item was not found.");
    return parseRevision(row);
  }

  async history(itemId: string): Promise<{
    revisions: StudioRevision[];
    events: StudioWorkflowEvent[];
  }> {
    const revisionsResult = await this.database.prepare(
      `${REVISION_SELECT} WHERE r.item_id = ? ORDER BY r.revision DESC`,
    ).bind(itemId).all<RevisionRow>();
    const eventsResult = await this.database.prepare(
      `SELECT id, item_id AS itemId, revision_id AS revisionId, sequence,
              from_state AS fromState, to_state AS toState,
              actor_user_id AS actorUserId, actor_session_id AS actorSessionId,
              idempotency_key AS idempotencyKey,
              request_sha256 AS requestSha256,
              metadata_json AS metadataJson, occurred_at AS occurredAt
         FROM content_workflow_events WHERE item_id = ?
        ORDER BY occurred_at DESC, id DESC`,
    ).bind(itemId).all<Omit<StudioWorkflowEvent, "metadata"> & { metadataJson: string }>();
    if (!revisionsResult.success || !eventsResult.success) {
      throw new Error("Unable to read Studio history.");
    }
    return {
      revisions: (revisionsResult.results ?? []).map(parseRevision),
      events: (eventsResult.results ?? []).map(({ metadataJson, ...event }) => ({
        ...event,
        metadata: JSON.parse(metadataJson) as Record<string, unknown>,
      })),
    };
  }

  async createDraft(input: {
    actorUserId: string;
    actorSessionId: string | null;
    itemType: StudioItemType;
    stableKey: string;
    title: string;
    level: StudioLevel;
    content: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<StudioRevision> {
    assertMutationIdentity(input);
    const stableKey = input.stableKey.trim().toLowerCase();
    const title = input.title.trim();
    if (!validStableKey(stableKey) || !title || title.length > 240) {
      throw new TypeError("Stable key or title is invalid.");
    }
    const canonicalJson = canonicalStudioJson(input.content);
    if (canonicalJson.length > 1_048_576) throw new TypeError("Content exceeds 1 MiB.");
    const contentSha256 = await studioSha256(canonicalJson);
    const operationSha256 = await requestDigest({
      operation: "create",
      itemType: input.itemType,
      stableKey,
      title,
      level: input.level,
      contentSha256,
    });
    const replay = await this.findIdempotentRevision(
      input.actorUserId,
      input.idempotencyKey,
      operationSha256,
    );
    if (replay) return replay;

    const itemId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const timestamp = Date.now();
    try {
      await this.database.batch([
        this.database.prepare(
          `INSERT INTO content_items (
            id, stable_key, item_type, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(itemId, stableKey, input.itemType, input.actorUserId, timestamp, timestamp),
        this.database.prepare(
          `INSERT INTO content_revisions (
            id, item_id, revision, schema_version, workflow_state, title, level,
            content_json, content_sha256, row_version, author_user_id,
            created_at, updated_at
          ) VALUES (?, ?, 1, 1, 'draft', ?, ?, ?, ?, 1, ?, ?, ?)`,
        ).bind(
          revisionId,
          itemId,
          title,
          input.level,
          canonicalJson,
          contentSha256,
          input.actorUserId,
          timestamp,
          timestamp,
        ),
        this.database.prepare(
          `INSERT INTO content_workflow_events (
            id, item_id, revision_id, sequence, from_state, to_state,
            actor_user_id, actor_session_id, idempotency_key, request_sha256,
            metadata_json, occurred_at
          ) VALUES (?, ?, ?, 1, NULL, 'draft', ?, ?, ?, ?, '{}', ?)`,
        ).bind(
          eventId,
          itemId,
          revisionId,
          input.actorUserId,
          input.actorSessionId,
          input.idempotencyKey,
          operationSha256,
          timestamp,
        ),
      ]);
    } catch (error) {
      const concurrentReplay = await this.findIdempotentRevision(
        input.actorUserId,
        input.idempotencyKey,
        operationSha256,
      );
      if (concurrentReplay) return concurrentReplay;
      throw error;
    }
    return this.getRevision(revisionId);
  }

  async updateDraft(input: {
    actorUserId: string;
    actorSessionId: string | null;
    revisionId: string;
    expectedRowVersion: number;
    title: string;
    level: StudioLevel;
    content: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<StudioRevision> {
    assertMutationIdentity(input);
    const title = input.title.trim();
    if (!title || title.length > 240) throw new TypeError("Title is invalid.");
    const contentJson = canonicalStudioJson(input.content);
    if (contentJson.length > 1_048_576) throw new TypeError("Content exceeds 1 MiB.");
    const contentSha256 = await studioSha256(contentJson);
    const operationSha256 = await requestDigest({
      operation: "update",
      revisionId: input.revisionId,
      expectedRowVersion: input.expectedRowVersion,
      title,
      level: input.level,
      contentSha256,
    });
    const replay = await this.findIdempotentRevision(
      input.actorUserId,
      input.idempotencyKey,
      operationSha256,
    );
    if (replay) return replay;
    const current = await this.getRevision(input.revisionId);
    if (current.workflowState !== "draft") {
      throw new ContentStudioTransitionError(
        "Only draft revisions can be edited; fork a published revision first.",
      );
    }
    if (current.rowVersion !== input.expectedRowVersion) {
      throw new ContentStudioConcurrencyError("Draft changed in another session.");
    }
    const sequence = await nextEventSequence(this.database, current.id);
    const timestamp = Date.now();
    const result = await this.database.batch([
      this.database.prepare(
        `UPDATE content_revisions
            SET title = ?, level = ?, content_json = ?, content_sha256 = ?,
                validation_json = NULL, validation_sha256 = NULL,
                row_version = row_version + 1, updated_at = ?
          WHERE id = ? AND workflow_state = 'draft' AND row_version = ?`,
      ).bind(
        title,
        input.level,
        contentJson,
        contentSha256,
        timestamp,
        current.id,
        input.expectedRowVersion,
      ),
      eventStatement(this.database, {
        id: crypto.randomUUID(),
        itemId: current.itemId,
        revisionId: current.id,
        sequence,
        fromState: "draft",
        toState: "draft",
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        idempotencyKey: input.idempotencyKey,
        requestSha256: operationSha256,
        metadata: { action: "edited", contentSha256 },
        occurredAt: timestamp,
        requiredRowVersion: input.expectedRowVersion + 1,
      }),
    ]);
    if ((result[0]?.meta?.changes ?? 0) !== 1 || (result[1]?.meta?.changes ?? 0) !== 1) {
      throw new ContentStudioConcurrencyError("Draft changed in another session.");
    }
    return this.getRevision(current.id);
  }

  async validateRevision(input: {
    actorUserId: string;
    actorSessionId: string | null;
    revisionId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    requestId?: string;
  }): Promise<StudioRevision> {
    assertMutationIdentity(input);
    const current = await this.getRevision(input.revisionId);
    const validated = await validateStudioContent(current.itemType, current.content);
    if (
      current.itemType === "exam_form"
      && current.content.examLevel !== current.level
    ) {
      validated.result.valid = false;
      validated.result.checks.structure = false;
      validated.result.errors.push({
        path: "examLevel",
        message: "Cấp HSK của cửa phải trùng với cấp độ phân loại nội dung.",
      });
    }
    if (validated.result.contentSha256 !== current.contentSha256) {
      throw new ContentStudioTransitionError("Stored content digest is inconsistent.");
    }
    const validationJson = canonicalStudioJson(validated.result);
    const validationSha256 = await studioSha256(validationJson);
    const nextState: StudioWorkflowState = validated.result.valid ? "validated" : "draft";
    const operationSha256 = await requestDigest({
      operation: "validate",
      revisionId: current.id,
      expectedRowVersion: input.expectedRowVersion,
      contentSha256: current.contentSha256,
      validationSha256,
    });
    const replay = await this.findIdempotentRevision(
      input.actorUserId,
      input.idempotencyKey,
      operationSha256,
    );
    if (replay) return replay;
    if (current.workflowState !== "draft") {
      throw new ContentStudioTransitionError("Only a draft can enter validation.");
    }
    if (current.rowVersion !== input.expectedRowVersion) {
      throw new ContentStudioConcurrencyError("Draft changed before validation.");
    }
    const timestamp = Date.now();
    const sequence = await nextEventSequence(this.database, current.id);
    const validationRequested = await encodeContentReleaseEvent({
      id: crypto.randomUUID(),
      eventType: "content.validation.requested",
      itemId: current.itemId,
      revisionId: current.id,
      correlationId: input.requestId ?? crypto.randomUUID(),
      causationId: null,
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      createdAt: timestamp,
      payload: {
        revisionId: current.id,
        itemId: current.itemId,
        stableKey: current.stableKey,
        itemType: current.itemType,
        contentSha256: current.contentSha256,
        validationSha256,
        requestedAt: timestamp,
      },
    });
    const result = await this.database.batch([
      this.database.prepare(
        `UPDATE content_revisions
            SET workflow_state = ?, validation_json = ?, validation_sha256 = ?,
                row_version = row_version + 1, updated_at = ?
          WHERE id = ? AND workflow_state = 'draft' AND row_version = ?`,
      ).bind(
        nextState,
        validationJson,
        validationSha256,
        timestamp,
        current.id,
        input.expectedRowVersion,
      ),
      eventStatement(this.database, {
        id: crypto.randomUUID(),
        itemId: current.itemId,
        revisionId: current.id,
        sequence,
        fromState: "draft",
        toState: nextState,
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        idempotencyKey: input.idempotencyKey,
        requestSha256: operationSha256,
        metadata: {
          action: validated.result.valid ? "validation_passed" : "validation_failed",
          validationSha256,
          errorCount: validated.result.errors.length,
        },
        occurredAt: timestamp,
        requiredRowVersion: input.expectedRowVersion + 1,
      }),
      contentReleaseEventInsertStatement(this.database, validationRequested, {
        requiredWorkflowState: nextState,
        requiredRowVersion: input.expectedRowVersion + 1,
      }),
    ]);
    if (
      (result[0]?.meta?.changes ?? 0) !== 1
      || (result[1]?.meta?.changes ?? 0) !== 1
      || (result[2]?.meta?.changes ?? 0) !== 1
    ) {
      throw new ContentStudioConcurrencyError("Draft changed before validation.");
    }
    return this.getRevision(current.id);
  }

  async transition(input: {
    actorUserId: string;
    actorSessionId: string | null;
    revisionId: string;
    expectedRowVersion: number;
    toState: "submitted" | "approved" | "published" | "archived";
    idempotencyKey: string;
    requestId: string;
    note?: string;
  }): Promise<StudioRevision> {
    assertMutationIdentity(input);
    const current = await this.getRevision(input.revisionId);
    const expectedFrom: Record<typeof input.toState, StudioWorkflowState> = {
      submitted: "validated",
      approved: "submitted",
      published: "approved",
      archived: "published",
    };
    const fromState = expectedFrom[input.toState];
    if (input.toState === "published" && current.itemType === "exam_form") {
      const occupied = await this.database.prepare(
        `SELECT r.id
           FROM content_revisions r
           INNER JOIN content_items i ON i.id = r.item_id
          WHERE i.item_type = 'exam_form'
            AND r.workflow_state = 'published'
            AND r.id <> ?
            AND json_extract(r.content_json, '$.examLevel') = ?
            AND lower(json_extract(r.content_json, '$.formKey')) = lower(?)
          LIMIT 1`,
      ).bind(
        current.id,
        current.content.examLevel,
        current.content.formKey,
      ).first<{ id: string }>();
      if (occupied) {
        throw new ContentStudioTransitionError(
          "Cửa này đang có một bản phát hành khác; hãy lưu trữ bản cũ trước.",
        );
      }
    }
    const note = input.note?.trim().slice(0, 1_000) ?? "";
    const operationSha256 = await requestDigest({
      operation: "transition",
      revisionId: current.id,
      expectedRowVersion: input.expectedRowVersion,
      fromState,
      toState: input.toState,
      contentSha256: current.contentSha256,
      validationSha256: current.validationSha256,
      note,
    });
    const replay = await this.findIdempotentRevision(
      input.actorUserId,
      input.idempotencyKey,
      operationSha256,
    );
    if (replay) return replay;
    if (current.workflowState !== fromState) {
      throw new ContentStudioTransitionError(
        `Transition ${current.workflowState} -> ${input.toState} is not allowed.`,
      );
    }
    if (current.rowVersion !== input.expectedRowVersion) {
      throw new ContentStudioConcurrencyError("Revision changed in another session.");
    }
    if (
      !current.validation?.valid
      || current.validation.contentSha256 !== current.contentSha256
      || !current.validationSha256
    ) {
      throw new ContentStudioTransitionError("A current successful validation is required.");
    }

    const timestamp = Date.now();
    const sequence = await nextEventSequence(this.database, current.id);
    const statements: D1PreparedStatement[] = [];
    let releaseRequested: EncodedContentReleaseEvent<"content.release.requested"> | null = null;
    let autoArchived: StudioRevision | null = null;
    if (input.toState === "published") {
      const existing = await this.database.prepare(
        `${REVISION_SELECT} WHERE r.item_id = ? AND r.workflow_state = 'published'
         AND r.id <> ? LIMIT 1`,
      ).bind(current.itemId, current.id).first<RevisionRow>();
      autoArchived = existing ? parseRevision(existing) : null;
      if (autoArchived) {
        const archiveSequence = await nextEventSequence(this.database, autoArchived.id);
        const archiveEventId = crypto.randomUUID();
        statements.push(
          this.database.prepare(
            `UPDATE content_revisions
                SET workflow_state = 'archived', archived_at = ?,
                    row_version = row_version + 1, updated_at = ?
              WHERE id = ? AND workflow_state = 'published'
                AND EXISTS (
                  SELECT 1 FROM content_revisions target
                   WHERE target.id = ? AND target.workflow_state = 'approved'
                     AND target.row_version = ?
                )`,
          ).bind(
            timestamp,
            timestamp,
            autoArchived.id,
            current.id,
            input.expectedRowVersion,
          ),
          eventStatement(this.database, {
            id: archiveEventId,
            itemId: autoArchived.itemId,
            revisionId: autoArchived.id,
            sequence: archiveSequence,
            fromState: "published",
            toState: "archived",
            actorUserId: input.actorUserId,
            actorSessionId: input.actorSessionId,
            idempotencyKey: `auto:${archiveEventId}`,
            requestSha256: operationSha256,
            metadata: { action: "superseded", supersededByRevisionId: current.id },
            occurredAt: timestamp,
            requiredRowVersion: autoArchived.rowVersion + 1,
          }),
        );
      }
    }
    const targetUpdateIndex = statements.length;
    statements.push(
      this.database.prepare(
        `UPDATE content_revisions
            SET workflow_state = ?,
                published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END,
                archived_at = CASE WHEN ? = 'archived' THEN ? ELSE archived_at END,
                row_version = row_version + 1, updated_at = ?
          WHERE id = ? AND workflow_state = ? AND row_version = ?`,
      ).bind(
        input.toState,
        input.toState,
        timestamp,
        input.toState,
        timestamp,
        timestamp,
        current.id,
        fromState,
        input.expectedRowVersion,
      ),
      eventStatement(this.database, {
        id: crypto.randomUUID(),
        itemId: current.itemId,
        revisionId: current.id,
        sequence,
        fromState,
        toState: input.toState,
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        idempotencyKey: input.idempotencyKey,
        requestSha256: operationSha256,
        metadata: { note, contentSha256: current.contentSha256 },
        occurredAt: timestamp,
        requiredRowVersion: input.expectedRowVersion + 1,
      }),
    );
    if (input.toState === "published" || input.toState === "archived") {
      releaseRequested = await encodeContentReleaseEvent({
        id: crypto.randomUUID(),
        eventType: "content.release.requested",
        itemId: current.itemId,
        revisionId: current.id,
        correlationId: input.requestId,
        causationId: null,
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        createdAt: timestamp,
        payload: {
          revisionId: current.id,
          itemId: current.itemId,
          stableKey: current.stableKey,
          itemType: current.itemType,
          contentSha256: current.contentSha256,
          validationSha256: current.validationSha256,
          requestedAt: timestamp,
          action: input.toState === "published" ? "publish" : "archive",
          revision: current.revision,
        },
      });
      statements.push(contentReleaseEventInsertStatement(this.database, releaseRequested, {
        requiredWorkflowState: input.toState,
        requiredRowVersion: input.expectedRowVersion + 1,
      }));
    }
    const results = await this.database.batch(statements);
    if (
      (results[targetUpdateIndex]?.meta?.changes ?? 0) !== 1
      || (results[targetUpdateIndex + 1]?.meta?.changes ?? 0) !== 1
      || (releaseRequested && (results[targetUpdateIndex + 2]?.meta?.changes ?? 0) !== 1)
      || (autoArchived && (
        (results[0]?.meta?.changes ?? 0) !== 1
        || (results[1]?.meta?.changes ?? 0) !== 1
      ))
    ) {
      throw new ContentStudioConcurrencyError("Revision changed during transition.");
    }

    if (input.toState === "approved" || input.toState === "published") {
      await new AuditRepository(this.database).append({
        category: input.toState === "approved" ? "approval" : "publication",
        action: input.toState === "approved"
          ? "content.revision.approved"
          : "content.revision.published",
        outcome: "success",
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        targetType: "content_revision",
        targetId: current.id,
        requestId: input.requestId,
        metadata: {
          itemId: current.itemId,
          stableKey: current.stableKey,
          revision: current.revision,
          contentSha256: current.contentSha256,
        },
      });
    }
    return this.getRevision(current.id);
  }

  async forkRevision(input: {
    actorUserId: string;
    actorSessionId: string | null;
    sourceRevisionId: string;
    idempotencyKey: string;
  }): Promise<StudioRevision> {
    assertMutationIdentity(input);
    const source = await this.getRevision(input.sourceRevisionId);
    if (source.workflowState !== "published" && source.workflowState !== "archived") {
      throw new ContentStudioTransitionError("Only a published or archived revision can be forked.");
    }
    const operationSha256 = await requestDigest({
      operation: "fork",
      sourceRevisionId: source.id,
      sourceContentSha256: source.contentSha256,
    });
    const replay = await this.findIdempotentRevision(
      input.actorUserId,
      input.idempotencyKey,
      operationSha256,
    );
    if (replay) return replay;
    const latest = await this.getLatestRevision(source.itemId);
    const revisionId = crypto.randomUUID();
    const timestamp = Date.now();
    try {
      await this.database.batch([
        this.database.prepare(
          `INSERT INTO content_revisions (
            id, item_id, revision, schema_version, workflow_state, title, level,
            content_json, content_sha256, based_on_revision_id, row_version,
            author_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, 1, 'draft', ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        ).bind(
          revisionId,
          source.itemId,
          latest.revision + 1,
          source.title,
          source.level,
          canonicalStudioJson(source.content),
          source.contentSha256,
          source.id,
          input.actorUserId,
          timestamp,
          timestamp,
        ),
        this.database.prepare(
          `INSERT INTO content_workflow_events (
            id, item_id, revision_id, sequence, from_state, to_state,
            actor_user_id, actor_session_id, idempotency_key, request_sha256,
            metadata_json, occurred_at
          ) VALUES (?, ?, ?, 1, NULL, 'draft', ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          source.itemId,
          revisionId,
          input.actorUserId,
          input.actorSessionId,
          input.idempotencyKey,
          operationSha256,
          canonicalStudioJson({ forkedFromRevisionId: source.id }),
          timestamp,
        ),
      ]);
    } catch (error) {
      const concurrentReplay = await this.findIdempotentRevision(
        input.actorUserId,
        input.idempotencyKey,
        operationSha256,
      );
      if (concurrentReplay) return concurrentReplay;
      throw new ContentStudioConcurrencyError(
        error instanceof Error ? error.message : "Unable to fork revision.",
      );
    }
    return this.getRevision(revisionId);
  }

  async publishedRuntime(input: {
    itemType?: StudioItemType | null;
    level?: StudioLevel | null;
  } = {}) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.itemType) {
      clauses.push("json_extract(package.package_json, '$.itemType') = ?");
      values.push(input.itemType);
    }
    if (input.level) {
      clauses.push("json_extract(package.package_json, '$.level') = ?");
      values.push(input.level);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await this.database.prepare(
      `SELECT package.package_json AS packageJson,
              package.package_sha256 AS packageSha256,
              package.manifest_json AS manifestJson,
              package.manifest_sha256 AS manifestSha256
         FROM content_release_heads head
         INNER JOIN content_release_packages package ON package.id = head.package_id
         ${where}
        ORDER BY json_extract(package.package_json, '$.stableKey')`,
    ).bind(...values).all<{
      packageJson: string;
      packageSha256: string;
      manifestJson: string;
      manifestSha256: string;
    }>();
    if (!result.success) throw new Error("Unable to read released content packages.");
    const packages = await Promise.all((result.results ?? []).map(async (row) => {
      if (
        await studioSha256(canonicalStudioJson(JSON.parse(row.packageJson))) !== row.packageSha256
        || await studioSha256(canonicalStudioJson(JSON.parse(row.manifestJson))) !== row.manifestSha256
      ) {
        throw new Error("Released content package failed its immutable digest fence.");
      }
      return {
        item: JSON.parse(row.packageJson) as PublishedStudioRuntimeItem,
        packageSha256: row.packageSha256,
        manifestSha256: row.manifestSha256,
      };
    }));
    const items = packages.map((entry) => entry.item);
    const manifest = {
      schemaVersion: 1 as const,
      policy: "published-only" as const,
      releaseBoundary: "content-release-worker-v1" as const,
      packages: packages.map(({ item, packageSha256, manifestSha256 }) => ({
        revisionId: item.revisionId,
        packageSha256,
        manifestSha256,
      })),
      items,
    };
    return {
      ...manifest,
      manifestSha256: await studioSha256(canonicalStudioJson(manifest)),
    };
  }

  async releasedRuntimeRevision(
    revisionId: string,
  ): Promise<PublishedStudioRuntimeItem | null> {
    const row = await this.database.prepare(
      `SELECT package_json AS packageJson, package_sha256 AS packageSha256,
              manifest_json AS manifestJson, manifest_sha256 AS manifestSha256
         FROM content_release_packages
        WHERE revision_id = ? LIMIT 1`,
    ).bind(revisionId).first<{
      packageJson: string;
      packageSha256: string;
      manifestJson: string;
      manifestSha256: string;
    }>();
    if (!row) return null;
    const packageValue = JSON.parse(row.packageJson) as PublishedStudioRuntimeItem;
    const manifestValue = JSON.parse(row.manifestJson) as unknown;
    if (
      packageValue.revisionId !== revisionId
      || await studioSha256(canonicalStudioJson(packageValue)) !== row.packageSha256
      || await studioSha256(canonicalStudioJson(manifestValue)) !== row.manifestSha256
    ) throw new Error("Released content package failed its immutable digest fence.");
    return packageValue;
  }

  private async findIdempotentRevision(
    actorUserId: string,
    idempotencyKey: string,
    requestSha256: string,
  ): Promise<StudioRevision | null> {
    const event = await this.database.prepare(
      `SELECT revision_id AS revisionId, request_sha256 AS requestSha256
         FROM content_workflow_events
        WHERE actor_user_id = ? AND idempotency_key = ? LIMIT 1`,
    ).bind(actorUserId, idempotencyKey).first<{
      revisionId: string;
      requestSha256: string;
    }>();
    if (!event) return null;
    if (event.requestSha256 !== requestSha256) {
      throw new ContentStudioIdempotencyError(
        "Idempotency key was already used for a different content command.",
      );
    }
    return this.getRevision(event.revisionId);
  }
}
