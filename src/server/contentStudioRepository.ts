import {
  canonicalStudioJson,
  isStudioItemType,
  isStudioLevel,
  isStudioWorkflowState,
  studioSha256,
  STUDIO_ITEM_TYPES,
  STUDIO_WORKFLOW_STATES,
  validateStudioContent,
  type StudioItemType,
  type StudioLevel,
  type StudioValidationResult,
  type StudioWorkflowState,
} from "../content/studioContent";
import { studioLessonMatchesLevel } from "../content/studioLessonIdentity";
import { studioReferenceCandidates } from "../content/studioRevisionAnalysis";
import { LESSON_BY_ID } from "../data/curriculum";
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

export type StudioOperationalSummary = {
  workflow: Record<StudioWorkflowState, number>;
  release: { pending: number; processing: number; published: number; dead: number; activePackages: number };
  assignment: { overdue: number; dueSoon: number; urgent: number; withoutReviewer: number };
  byType: Record<StudioItemType, { total: number; published: number }>;
  readerSeries: { total: number; published: number };
  deadReleaseEvents: Array<{ id: string; revisionId: string; errorCode: string | null; attempts: number; createdAt: number }>;
};

export type StudioReleaseFailure = {
  id: string;
  revisionId: string;
  errorCode: string | null;
  attempts: number;
  createdAt: number;
};

export type StudioCoordinationPage = {
  revisions: StudioRevision[];
  filteredTotal: number;
};

export type StudioReleaseFailurePage = {
  events: StudioReleaseFailure[];
  filteredTotal: number;
};

export const STUDIO_ASSIGNMENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type StudioAssignmentPriority = typeof STUDIO_ASSIGNMENT_PRIORITIES[number];

export type StudioEditorialAssignment = {
  id: string | null;
  revisionId: string;
  rowVersion: number;
  ownerUserId: string;
  reviewerUserId: string | null;
  priority: StudioAssignmentPriority;
  dueAt: number | null;
  note: string | null;
  actorUserId: string | null;
  actorSessionId: string | null;
  occurredAt: number | null;
  isExplicit: boolean;
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

type AssignmentRow = Omit<StudioEditorialAssignment, "isExplicit" | "id" | "actorUserId" | "occurredAt"> & {
  id: string;
  actorUserId: string;
  occurredAt: number;
};

const ASSIGNMENT_SELECT = `SELECT assignment.id,
       assignment.revision_id AS revisionId,
       assignment.row_version AS rowVersion,
       assignment.owner_user_id AS ownerUserId,
       assignment.reviewer_user_id AS reviewerUserId,
       assignment.priority,
       assignment.due_at AS dueAt,
       assignment.note,
       assignment.actor_user_id AS actorUserId,
       assignment.actor_session_id AS actorSessionId,
       assignment.occurred_at AS occurredAt
  FROM content_revision_assignment_events assignment`;

const isAssignmentPriority = (value: unknown): value is StudioAssignmentPriority =>
  typeof value === "string"
  && STUDIO_ASSIGNMENT_PRIORITIES.includes(value as StudioAssignmentPriority);

const parseAssignment = (row: AssignmentRow): StudioEditorialAssignment => {
  if (!isAssignmentPriority(row.priority)) throw new Error("Stored editorial priority is invalid.");
  return { ...row, isExplicit: true };
};

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

export type StudioRevisionListInput = {
  itemType?: StudioItemType | null;
  state?: StudioWorkflowState | null;
  level?: StudioLevel | null;
  ownerUserId?: string | null;
  query?: string | null;
  limit?: number;
  offset?: number;
};

const revisionListFilters = (input: StudioRevisionListInput) => {
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
  if (input.ownerUserId) {
    clauses.push(`COALESCE((
      SELECT assignment.owner_user_id
        FROM content_revision_assignment_events assignment
       WHERE assignment.revision_id = r.id
       ORDER BY assignment.row_version DESC LIMIT 1
    ), r.author_user_id) = ?`);
    values.push(input.ownerUserId);
  }
  const query = input.query?.trim().slice(0, 120) ?? "";
  if (query) {
    const escaped = query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
    clauses.push("(lower(r.title) LIKE lower(?) ESCAPE '\\' OR lower(i.stable_key) LIKE lower(?) ESCAPE '\\')");
    values.push(`%${escaped}%`, `%${escaped}%`);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

export class ContentStudioRepository {
  constructor(private readonly database: D1Database) {}

  async list(input: StudioRevisionListInput = {}): Promise<StudioRevision[]> {
    const { where, values } = revisionListFilters(input);
    const limit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 100)));
    const offset = Math.max(0, Math.min(100_000, Math.trunc(input.offset ?? 0)));
    const result = await this.database.prepare(
      `${REVISION_SELECT} ${where}
       ORDER BY r.updated_at DESC, r.item_id, r.revision DESC LIMIT ? OFFSET ?`,
    ).bind(...values, limit, offset).all<RevisionRow>();
    if (!result.success) throw new Error("Unable to list Studio revisions.");
    return (result.results ?? []).map(parseRevision);
  }

  async count(input: Omit<StudioRevisionListInput, "limit" | "offset"> = {}): Promise<number> {
    const { where, values } = revisionListFilters(input);
    const row = await this.database.prepare(
      `SELECT COUNT(*) AS count
         FROM content_revisions r
         INNER JOIN content_items i ON i.id = r.item_id
         ${where}`,
    ).bind(...values).first<{ count: number }>();
    if (!row) throw new Error("Unable to count Studio revisions.");
    return Number(row.count);
  }

  async coordinationQueuePage(input: {
    limit?: number;
    offset?: number;
    query?: string;
  } = {}): Promise<StudioCoordinationPage> {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 40)));
    const boundedOffset = Math.max(0, Math.min(100_000, Math.trunc(input.offset ?? 0)));
    const query = input.query?.trim().slice(0, 120) ?? "";
    const escaped = query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
    const queryClause = query
      ? "AND (lower(r.title) LIKE lower(?) ESCAPE '\\' OR lower(i.stable_key) LIKE lower(?) ESCAPE '\\')"
      : "";
    const queryValues = query ? [`%${escaped}%`, `%${escaped}%`] : [];
    const now = Date.now();
    const [result, count] = await Promise.all([
      this.database.prepare(
        `${REVISION_SELECT}
       WHERE r.workflow_state NOT IN ('published', 'archived')
         ${queryClause}
       ORDER BY
         CASE WHEN (
           SELECT assignment.due_at
             FROM content_revision_assignment_events assignment
            WHERE assignment.revision_id = r.id
            ORDER BY assignment.row_version DESC LIMIT 1
         ) < ? THEN 0 ELSE 1 END,
         CASE COALESCE((
           SELECT assignment.priority
             FROM content_revision_assignment_events assignment
            WHERE assignment.revision_id = r.id
            ORDER BY assignment.row_version DESC LIMIT 1
         ), 'normal')
           WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         CASE WHEN (
           SELECT assignment.due_at
             FROM content_revision_assignment_events assignment
            WHERE assignment.revision_id = r.id
            ORDER BY assignment.row_version DESC LIMIT 1
         ) IS NULL THEN 1 ELSE 0 END,
         (
           SELECT assignment.due_at
             FROM content_revision_assignment_events assignment
            WHERE assignment.revision_id = r.id
            ORDER BY assignment.row_version DESC LIMIT 1
         ),
         r.updated_at DESC
       LIMIT ? OFFSET ?`,
      ).bind(...queryValues, now, boundedLimit, boundedOffset).all<RevisionRow>(),
      this.database.prepare(
        `SELECT COUNT(*) AS total
           FROM content_revisions r
           INNER JOIN content_items i ON i.id = r.item_id
          WHERE r.workflow_state NOT IN ('published', 'archived')
            ${queryClause}`,
      ).bind(...queryValues).first<{ total: number }>(),
    ]);
    if (!result.success || !count) {
      throw new Error("Unable to list the editorial coordination queue.");
    }
    return {
      revisions: (result.results ?? []).map(parseRevision),
      filteredTotal: Number(count.total),
    };
  }

  async coordinationQueue(limit = 40): Promise<StudioRevision[]> {
    return (await this.coordinationQueuePage({ limit })).revisions;
  }

  async listReleaseFailurePage(input: {
    limit?: number;
    offset?: number;
  } = {}): Promise<StudioReleaseFailurePage> {
    const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 20)));
    const offset = Math.max(0, Math.min(100_000, Math.trunc(input.offset ?? 0)));
    const [events, count] = await Promise.all([
      this.database.prepare(
        `SELECT id, revision_id AS revisionId, last_error_code AS errorCode,
                attempts, created_at AS createdAt
           FROM content_release_outbox_events
          WHERE status = 'dead' AND event_type = 'content.release.requested'
          ORDER BY created_at DESC, id
          LIMIT ? OFFSET ?`,
      ).bind(limit, offset).all<StudioReleaseFailure>(),
      this.database.prepare(
        `SELECT COUNT(*) AS total
           FROM content_release_outbox_events
          WHERE status = 'dead' AND event_type = 'content.release.requested'`,
      ).first<{ total: number }>(),
    ]);
    if (!events.success || !count) throw new Error("Unable to list failed content releases.");
    return { events: events.results ?? [], filteredTotal: Number(count.total) };
  }

  async getRevision(revisionId: string): Promise<StudioRevision> {
    const row = await this.database.prepare(
      `${REVISION_SELECT} WHERE r.id = ? LIMIT 1`,
    ).bind(revisionId).first<RevisionRow>();
    if (!row) throw new ContentStudioNotFoundError("Content revision was not found.");
    return parseRevision(row);
  }

  async assignmentsFor(
    revisions: readonly StudioRevision[],
  ): Promise<StudioEditorialAssignment[]> {
    if (revisions.length === 0) return [];
    const bounded = revisions.slice(0, 200);
    const placeholders = bounded.map(() => "?").join(", ");
    const result = await this.database.prepare(
      `${ASSIGNMENT_SELECT}
        WHERE assignment.revision_id IN (${placeholders})
          AND assignment.row_version = (
            SELECT MAX(current.row_version)
              FROM content_revision_assignment_events current
             WHERE current.revision_id = assignment.revision_id
          )`,
    ).bind(...bounded.map((revision) => revision.id)).all<AssignmentRow>();
    if (!result.success) throw new Error("Unable to read editorial assignments.");
    const explicit = new Map(
      (result.results ?? []).map((row) => [row.revisionId, parseAssignment(row)]),
    );
    return bounded.map((revision) => explicit.get(revision.id) ?? {
      id: null,
      revisionId: revision.id,
      rowVersion: 0,
      ownerUserId: revision.authorUserId,
      reviewerUserId: null,
      priority: "normal",
      dueAt: null,
      note: null,
      actorUserId: null,
      actorSessionId: null,
      occurredAt: null,
      isExplicit: false,
    });
  }

  async setAssignment(input: {
    actorUserId: string;
    actorSessionId: string | null;
    revisionId: string;
    expectedRowVersion: number;
    ownerUserId: string;
    reviewerUserId?: string | null;
    priority: StudioAssignmentPriority;
    dueAt?: number | null;
    note?: string | null;
    idempotencyKey: string;
    requestId?: string;
  }): Promise<StudioEditorialAssignment> {
    assertMutationIdentity(input);
    const revision = await this.getRevision(input.revisionId);
    if (!isAssignmentPriority(input.priority)) throw new TypeError("Mức ưu tiên không hợp lệ.");
    const ownerUserId = input.ownerUserId.trim();
    const reviewerUserId = input.reviewerUserId?.trim() || null;
    const note = input.note?.trim().slice(0, 1_000) || null;
    const dueAt = input.dueAt === null || input.dueAt === undefined ? null : input.dueAt;
    if (!ownerUserId || ownerUserId.length > 128 || (reviewerUserId?.length ?? 0) > 128) {
      throw new TypeError("Người phụ trách hoặc người duyệt không hợp lệ.");
    }
    if (reviewerUserId === ownerUserId || reviewerUserId === revision.authorUserId) {
      throw new ContentStudioTransitionError(
        "Người soạn hoặc người phụ trách không thể duyệt chính bản này.",
      );
    }
    if (
      dueAt !== null
      && (!Number.isSafeInteger(dueAt) || dueAt < 0 || dueAt > 8_640_000_000_000_000)
    ) {
      throw new TypeError("Hạn xử lý không hợp lệ.");
    }
    const roleRows = await this.database.prepare(
      `SELECT u.id AS userId, u.status, COALESCE(GROUP_CONCAT(ur.role), '') AS roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
        WHERE u.id IN (?, ?)
        GROUP BY u.id, u.status`,
    ).bind(ownerUserId, reviewerUserId).all<{
      userId: string;
      status: string;
      roles: string;
    }>();
    if (!roleRows.success) throw new Error("Unable to verify editorial assignees.");
    const roles = new Map((roleRows.results ?? []).map((row) => [row.userId, row]));
    const owner = roles.get(ownerUserId);
    const reviewer = reviewerUserId ? roles.get(reviewerUserId) : null;
    if (!owner || owner.status !== "active" || !owner.roles.split(",").includes("content_editor")) {
      throw new ContentStudioTransitionError(
        "Người phụ trách phải là Biên tập viên đang hoạt động.",
      );
    }
    if (
      reviewerUserId
      && (!reviewer || reviewer.status !== "active" || !reviewer.roles.split(",").includes("admin"))
    ) {
      throw new ContentStudioTransitionError(
        "Người duyệt phải là Điều Hành Viên đang hoạt động.",
      );
    }
    const operationSha256 = await requestDigest({
      operation: "assign",
      revisionId: revision.id,
      expectedRowVersion: input.expectedRowVersion,
      ownerUserId,
      reviewerUserId,
      priority: input.priority,
      dueAt,
      note,
    });
    const replay = await this.database.prepare(
      `${ASSIGNMENT_SELECT}
        WHERE assignment.actor_user_id = ? AND assignment.idempotency_key = ? LIMIT 1`,
    ).bind(input.actorUserId, input.idempotencyKey).first<AssignmentRow>();
    if (replay) {
      const digest = await this.database.prepare(
        "SELECT request_sha256 AS requestSha256 FROM content_revision_assignment_events WHERE id = ?",
      ).bind(replay.id).first<{ requestSha256: string }>();
      if (digest?.requestSha256 !== operationSha256) {
        throw new ContentStudioIdempotencyError(
          "Idempotency key was already used for another assignment command.",
        );
      }
      return parseAssignment(replay);
    }
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    const result = await this.database.prepare(
      `INSERT INTO content_revision_assignment_events (
        id, revision_id, row_version, owner_user_id, reviewer_user_id,
        priority, due_at, note, actor_user_id, actor_session_id,
        idempotency_key, request_sha256, occurred_at
      ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE COALESCE((
           SELECT MAX(current.row_version)
             FROM content_revision_assignment_events current
            WHERE current.revision_id = ?
         ), 0) = ?`,
    ).bind(
      id,
      revision.id,
      input.expectedRowVersion + 1,
      ownerUserId,
      reviewerUserId,
      input.priority,
      dueAt,
      note,
      input.actorUserId,
      input.actorSessionId,
      input.idempotencyKey,
      operationSha256,
      timestamp,
      revision.id,
      input.expectedRowVersion,
    ).run();
    if ((result.meta?.changes ?? 0) !== 1) {
      throw new ContentStudioConcurrencyError("Phân công đã thay đổi ở một phiên khác.");
    }
    const stored = await this.database.prepare(
      `${ASSIGNMENT_SELECT} WHERE assignment.id = ? LIMIT 1`,
    ).bind(id).first<AssignmentRow>();
    if (!stored) throw new Error("Unable to read stored editorial assignment.");
    await new AuditRepository(this.database).appendBestEffort({
      category: "approval",
      action: "content.assignment.updated",
      outcome: "success",
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      targetType: "content_revision",
      targetId: revision.id,
      requestId: input.requestId ?? input.idempotencyKey,
      metadata: {
        ownerUserId,
        reviewerUserId,
        priority: input.priority,
        dueAt,
        assignmentRowVersion: input.expectedRowVersion + 1,
      },
    });
    return parseAssignment(stored);
  }

  async assignmentHistory(revisionId: string, limit = 50): Promise<StudioEditorialAssignment[]> {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const result = await this.database.prepare(
      `${ASSIGNMENT_SELECT}
        WHERE assignment.revision_id = ?
        ORDER BY assignment.row_version DESC LIMIT ?`,
    ).bind(revisionId, boundedLimit).all<AssignmentRow>();
    if (!result.success) throw new Error("Unable to read editorial assignment history.");
    return (result.results ?? []).map(parseAssignment);
  }

  async referencedBy(revision: StudioRevision, limit = 30): Promise<StudioRevision[]> {
    const candidates = studioReferenceCandidates(revision.stableKey, revision.content);
    if (candidates.length === 0) return [];
    const placeholders = candidates.map(() => "?").join(", ");
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const result = await this.database.prepare(
      `${REVISION_SELECT}
        WHERE r.id <> ?
          AND EXISTS (
            SELECT 1 FROM json_tree(r.content_json) reference
             WHERE reference.type = 'text' AND reference.value IN (${placeholders})
          )
        ORDER BY r.updated_at DESC LIMIT ?`,
    ).bind(revision.id, ...candidates, boundedLimit).all<RevisionRow>();
    if (!result.success) throw new Error("Unable to analyze content references.");
    return (result.results ?? []).map(parseRevision);
  }

  async operationalSummary(): Promise<StudioOperationalSummary> {
    const workflowRows = await this.database.prepare(
      "SELECT workflow_state AS state, COUNT(*) AS count FROM content_revisions GROUP BY workflow_state",
    ).all<{ state: StudioWorkflowState; count: number }>();
    const releaseRows = await this.database.prepare(
      "SELECT status, COUNT(*) AS count FROM content_release_outbox_events GROUP BY status",
    ).all<{ status: "pending" | "processing" | "published" | "dead"; count: number }>();
    const activePackages = await this.database.prepare(
      "SELECT COUNT(*) AS count FROM content_release_heads",
    ).first<{ count: number }>();
    const typeRows = await this.database.prepare(
      `SELECT i.item_type AS itemType,
              COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN r.workflow_state = 'published' THEN 1 ELSE 0 END), 0) AS published
         FROM content_revisions r
         INNER JOIN content_items i ON i.id = r.item_id
        GROUP BY i.item_type`,
    ).all<{ itemType: StudioItemType; total: number; published: number }>();
    const readerSeries = await this.database.prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN r.workflow_state = 'published' THEN 1 ELSE 0 END), 0) AS published
         FROM content_revisions r
         INNER JOIN content_items i ON i.id = r.item_id
        WHERE i.stable_key LIKE 'reader.series.%'`,
    ).first<{ total: number; published: number }>();
    const dead = await this.database.prepare(
      `SELECT id, revision_id AS revisionId, last_error_code AS errorCode,
              attempts, created_at AS createdAt
         FROM content_release_outbox_events
        WHERE status = 'dead' AND event_type = 'content.release.requested'
        ORDER BY created_at DESC LIMIT 20`,
    ).all<{ id: string; revisionId: string; errorCode: string | null; attempts: number; createdAt: number }>();
    const now = Date.now();
    const assignment = await this.database.prepare(
      `WITH latest_assignment AS (
        SELECT event.* FROM content_revision_assignment_events event
         WHERE event.row_version = (
           SELECT MAX(current.row_version)
             FROM content_revision_assignment_events current
            WHERE current.revision_id = event.revision_id
         )
      )
      SELECT
        COALESCE(SUM(CASE WHEN assignment.due_at IS NOT NULL AND assignment.due_at < ? THEN 1 ELSE 0 END), 0) AS overdue,
        COALESCE(SUM(CASE WHEN assignment.due_at BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) AS dueSoon,
        COALESCE(SUM(CASE WHEN assignment.priority = 'urgent' THEN 1 ELSE 0 END), 0) AS urgent,
        COALESCE(SUM(CASE WHEN revision.workflow_state IN ('submitted', 'approved') AND assignment.reviewer_user_id IS NULL THEN 1 ELSE 0 END), 0) AS withoutReviewer
      FROM content_revisions revision
      LEFT JOIN latest_assignment assignment ON assignment.revision_id = revision.id
      WHERE revision.workflow_state NOT IN ('published', 'archived')`,
    ).bind(now, now, now + 72 * 60 * 60 * 1_000).first<{
      overdue: number;
      dueSoon: number;
      urgent: number;
      withoutReviewer: number;
    }>();
    if (!workflowRows.success || !releaseRows.success || !typeRows.success || !dead.success || !assignment || !readerSeries) {
      throw new Error("Unable to read Studio operational summary.");
    }
    const workflow = Object.fromEntries(STUDIO_WORKFLOW_STATES.map((state) => [state, 0])) as Record<StudioWorkflowState, number>;
    for (const row of workflowRows.results ?? []) {
      if (isStudioWorkflowState(row.state)) workflow[row.state] = Number(row.count);
    }
    const release = { pending: 0, processing: 0, published: 0, dead: 0, activePackages: Number(activePackages?.count ?? 0) };
    for (const row of releaseRows.results ?? []) release[row.status] = Number(row.count);
    const byType = Object.fromEntries(
      STUDIO_ITEM_TYPES.map((itemType) => [itemType, { total: 0, published: 0 }]),
    ) as Record<StudioItemType, { total: number; published: number }>;
    for (const row of typeRows.results ?? []) {
      if (isStudioItemType(row.itemType)) {
        byType[row.itemType] = { total: Number(row.total), published: Number(row.published) };
      }
    }
    return {
      workflow,
      release,
      assignment: {
        overdue: Number(assignment.overdue),
        dueSoon: Number(assignment.dueSoon),
        urgent: Number(assignment.urgent),
        withoutReviewer: Number(assignment.withoutReviewer),
      },
      byType,
      readerSeries: { total: Number(readerSeries.total), published: Number(readerSeries.published) },
      deadReleaseEvents: dead.results ?? [],
    };
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
    if (current.itemType === "lesson") {
      const targetLesson = typeof current.content.targetLessonId === "string"
        ? LESSON_BY_ID.get(current.content.targetLessonId)
        : undefined;
      if (!targetLesson || !studioLessonMatchesLevel(targetLesson.unitId, current.level)) {
        validated.result.valid = false;
        validated.result.checks.structure = false;
        validated.result.errors.push({
          path: "targetLessonId",
          message: "Bài học đích phải thuộc đúng cấp HSK đã phân loại.",
        });
      }
    }
    if ([
      "vocabulary",
      "character",
      "grammar",
      "pronunciation",
      "communicative_function",
      "graded_text",
      "exam_item",
    ].includes(current.itemType)) {
      const sourceLessonIds = Array.isArray(current.content.sourceLessonIds)
        ? current.content.sourceLessonIds
        : [];
      const linksMatchLevel = sourceLessonIds.length > 0
        && sourceLessonIds.every((lessonId) => {
          const lesson = typeof lessonId === "string"
            ? LESSON_BY_ID.get(lessonId)
            : undefined;
          return Boolean(
            lesson && studioLessonMatchesLevel(lesson.unitId, current.level),
          );
        });
      if (!linksMatchLevel) {
        validated.result.valid = false;
        validated.result.checks.structure = false;
        validated.result.errors.push({
          path: "sourceLessonIds",
          message: "Mọi bài học nguồn phải thuộc đúng cấp HSK đã phân loại.",
        });
      }
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
    toState: "draft" | "submitted" | "approved" | "published" | "archived";
    idempotencyKey: string;
    requestId: string;
    note?: string;
  }): Promise<StudioRevision> {
    assertMutationIdentity(input);
    const current = await this.getRevision(input.revisionId);
    const expectedFrom: Record<typeof input.toState, StudioWorkflowState> = {
      draft: "submitted",
      submitted: "validated",
      approved: "submitted",
      published: "approved",
      archived: "published",
    };
    const fromState = expectedFrom[input.toState];
    if (input.toState === "approved" && current.authorUserId === input.actorUserId) {
      throw new ContentStudioTransitionError(
        "Người soạn không thể tự phê duyệt nội dung của chính mình.",
      );
    }
    if (input.toState === "approved" || input.toState === "draft") {
      const [assignment] = await this.assignmentsFor([current]);
      if (assignment.isExplicit && !assignment.reviewerUserId) {
        throw new ContentStudioTransitionError(
          "Nội dung đã được điều phối nhưng chưa chỉ định người duyệt độc lập.",
        );
      }
      if (assignment.reviewerUserId && assignment.reviewerUserId !== input.actorUserId) {
        throw new ContentStudioTransitionError(
          "Nội dung này đã được chỉ định cho một Điều Hành Viên khác duyệt.",
        );
      }
    }
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
    if (input.toState === "published" && current.itemType === "lesson") {
      const occupied = await this.database.prepare(
        `SELECT r.id
           FROM content_revisions r
           INNER JOIN content_items i ON i.id = r.item_id
          WHERE i.item_type = 'lesson'
            AND r.workflow_state = 'published'
            AND r.item_id <> ?
            AND json_extract(r.content_json, '$.targetLessonId') = ?
          LIMIT 1`,
      ).bind(
        current.itemId,
        current.content.targetLessonId,
      ).first<{ id: string }>();
      if (occupied) {
        throw new ContentStudioTransitionError(
          "Bài Thiên Lộ này đang có một bản phát hành khác; hãy lưu trữ bản cũ trước.",
        );
      }
    }
    const note = input.note?.trim().slice(0, 1_000) ?? "";
    if (input.toState === "draft" && note.length < 3) {
      throw new ContentStudioTransitionError(
        "Yêu cầu chỉnh sửa cần nêu rõ lý do để biên tập viên biết cách xử lý.",
      );
    }
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
                validation_json = CASE WHEN ? = 'draft' THEN NULL ELSE validation_json END,
                validation_sha256 = CASE WHEN ? = 'draft' THEN NULL ELSE validation_sha256 END,
                published_at = CASE WHEN ? = 'published' THEN ? ELSE published_at END,
                archived_at = CASE WHEN ? = 'archived' THEN ? ELSE archived_at END,
                row_version = row_version + 1, updated_at = ?
          WHERE id = ? AND workflow_state = ? AND row_version = ?`,
      ).bind(
        input.toState,
        input.toState,
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

    if (input.toState === "draft" || input.toState === "approved" || input.toState === "published") {
      await new AuditRepository(this.database).append({
        category: input.toState === "published" ? "publication" : "approval",
        action: input.toState === "draft"
          ? "content.revision.changes_requested"
          : input.toState === "approved"
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
    learnerSafe?: boolean;
  } = {}) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.learnerSafe) {
      clauses.push(
        "json_extract(package.package_json, '$.itemType') NOT IN ('exam_item', 'exam_form')",
      );
    }
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

  async releasedRuntimeRevisions(
    revisionIds: readonly string[],
  ): Promise<PublishedStudioRuntimeItem[]> {
    const uniqueIds = [...new Set(revisionIds.filter(Boolean))];
    const released: PublishedStudioRuntimeItem[] = [];
    for (let offset = 0; offset < uniqueIds.length; offset += 100) {
      const chunk = uniqueIds.slice(offset, offset + 100);
      const result = await this.database.prepare(
        `SELECT revision_id AS revisionId,
                package_json AS packageJson, package_sha256 AS packageSha256,
                manifest_json AS manifestJson, manifest_sha256 AS manifestSha256
           FROM content_release_packages
          WHERE revision_id IN (${chunk.map(() => "?").join(", ")})`,
      ).bind(...chunk).all<{
        revisionId: string;
        packageJson: string;
        packageSha256: string;
        manifestJson: string;
        manifestSha256: string;
      }>();
      if (!result.success) throw new Error("Unable to read immutable released revisions.");
      for (const row of result.results ?? []) {
        const packageValue = JSON.parse(row.packageJson) as PublishedStudioRuntimeItem;
        const manifestValue = JSON.parse(row.manifestJson) as unknown;
        if (
          packageValue.revisionId !== row.revisionId
          || await studioSha256(canonicalStudioJson(packageValue)) !== row.packageSha256
          || await studioSha256(canonicalStudioJson(manifestValue)) !== row.manifestSha256
        ) throw new Error("Released content package failed its immutable digest fence.");
        released.push(packageValue);
      }
    }
    return released;
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
