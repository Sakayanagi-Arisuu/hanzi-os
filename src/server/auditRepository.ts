import type { D1Database } from "./d1";

export const AUDIT_CATEGORIES = [
  "auth",
  "account",
  "role",
  "config",
  "approval",
  "publication",
] as const;

export type AuditCategory = typeof AUDIT_CATEGORIES[number];
export type AuditOutcome = "success" | "denied" | "failed";

export type AuditEvent = {
  id: string;
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  actorUserId: string | null;
  actorSessionId: string | null;
  targetType: string;
  targetId: string;
  requestId: string;
  metadata: Record<string, unknown>;
  createdAt: number;
};

export type AppendAuditEvent = Omit<AuditEvent, "id" | "createdAt" | "metadata"> & {
  id?: string;
  createdAt?: number;
  metadata?: Record<string, unknown>;
};

const AUDIT_NAME_PATTERN = /^[a-z][a-z0-9_.-]{2,119}$/u;
const TARGET_TYPE_PATTERN = /^[a-z][a-z0-9_.-]{1,79}$/u;

const serializeMetadata = (metadata: Record<string, unknown> | undefined) => {
  const value = JSON.stringify(metadata ?? {});
  if (value.length > 8_192) throw new Error("Audit metadata exceeds 8 KiB.");
  return value;
};

export const requestCorrelationId = (request: Request) => {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._:-]{8,160}$/u.test(supplied)
    ? supplied
    : crypto.randomUUID();
};

export class AuditRepository {
  constructor(private readonly database: D1Database) {}

  async append(input: AppendAuditEvent): Promise<string> {
    if (!AUDIT_NAME_PATTERN.test(input.action)) {
      throw new Error("Audit action is invalid.");
    }
    if (!TARGET_TYPE_PATTERN.test(input.targetType) || !input.targetId.trim()) {
      throw new Error("Audit target is invalid.");
    }
    const id = input.id ?? crypto.randomUUID();
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO audit_events (
          id, category, action, outcome, actor_user_id, actor_session_id,
          target_type, target_id, request_id, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.category,
        input.action,
        input.outcome,
        input.actorUserId,
        input.actorSessionId,
        input.targetType,
        input.targetId.trim().slice(0, 512),
        input.requestId,
        serializeMetadata(input.metadata),
        input.createdAt ?? Date.now(),
      )
      .run();
    return id;
  }

  async appendBestEffort(input: AppendAuditEvent): Promise<void> {
    try {
      await this.append(input);
    } catch {
      // Authentication must fail closed on its own checks, not on telemetry.
    }
  }

  async list(input: {
    limit?: number;
    category?: AuditCategory | null;
    actorUserId?: string | null;
  } = {}): Promise<AuditEvent[]> {
    const limit = Math.max(1, Math.min(200, Math.trunc(input.limit ?? 80)));
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.category) {
      clauses.push("category = ?");
      values.push(input.category);
    }
    if (input.actorUserId) {
      clauses.push("actor_user_id = ?");
      values.push(input.actorUserId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await this.database
      .prepare(
        `SELECT id, category, action, outcome,
                actor_user_id AS actorUserId,
                actor_session_id AS actorSessionId,
                target_type AS targetType,
                target_id AS targetId,
                request_id AS requestId,
                metadata_json AS metadataJson,
                created_at AS createdAt
           FROM audit_events
           ${where}
          ORDER BY created_at DESC, id DESC
          LIMIT ?`,
      )
      .bind(...values, limit)
      .all<Omit<AuditEvent, "metadata"> & { metadataJson: string }>();
    if (!result.success) throw new Error("Unable to list audit events.");
    return (result.results ?? []).map(({ metadataJson, ...event }) => ({
      ...event,
      targetId: event.targetId ?? "system",
      metadata: JSON.parse(metadataJson) as Record<string, unknown>,
    }));
  }
}
