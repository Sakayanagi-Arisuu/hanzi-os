import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  EditorialAssignmentEnvelope,
  Sha256Digest,
} from "../content/types";
import { canonicalStringify, sha256Hex } from "../sync/canonicalHash";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT,
  EditorialAssignmentIntegrityError,
  EditorialAssignmentRepository,
  type EditorialAssignmentActor,
  type EditorialAssignmentAppendReceipt,
  type EditorialAssignmentHead,
} from "./editorialAssignmentRepository";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];

  constructor(private readonly statement: StatementSync) {}

  bind(...values: unknown[]) {
    this.parameters = values;
    return this;
  }

  private sqliteParameters() {
    return this.parameters as Array<
      string | number | bigint | Uint8Array | null
    >;
  }

  async first<T = Record<string, unknown>>(
    columnName?: string,
  ): Promise<T | null> {
    const row = this.statement.get(...this.sqliteParameters()) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return {
      success: true,
      results: this.statement.all(...this.sqliteParameters()) as T[],
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    const result = this.statement.run(...this.sqliteParameters());
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

class SQLiteD1 implements D1Database {
  readonly database = new DatabaseSync(":memory:");

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migration);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query));
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    this.database.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) {
        results.push(await statement.run<T>());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const NOW = Date.parse("2026-07-28T08:00:00.000Z");
const MANIFEST = `sha256:${"a".repeat(64)}` as Sha256Digest;
const CATALOG = `sha256:${"b".repeat(64)}` as Sha256Digest;
const actor: EditorialAssignmentActor = {
  operatorId: "integrity-operator",
  credentialId: "integrity-credential",
};

const envelope = (
  assignmentId: string,
  itemKey: EditorialAssignmentEnvelope["scope"]["itemKeys"][number] =
    "lexeme:integrity",
): EditorialAssignmentEnvelope => ({
  schemaVersion: 1,
  assignmentId,
  contentVersion: "foundation-2026.07.6",
  packageManifestSha256: MANIFEST,
  itemCatalogSha256: CATALOG,
  role: "content-owner",
  assignedByOperatorId: actor.operatorId,
  assigneeOperatorId: "integrity-reviewer",
  assignedAt: new Date(NOW).toISOString(),
  scope: { itemKeys: [itemKey], audioAssetIds: [] },
});

const repository = (database: SQLiteD1) => {
  let eventSequence = 0;
  return new EditorialAssignmentRepository(database, {
    now: () => NOW,
    eventId: () => `integrity-event-${++eventSequence}`,
  });
};

const headOf = (
  receipt: EditorialAssignmentAppendReceipt,
): EditorialAssignmentHead => ({
  eventId: receipt.eventId,
  eventSha256: receipt.eventSha256,
  sequence: receipt.sequence,
});

const referenceOf = (receipt: EditorialAssignmentAppendReceipt) => {
  if (!receipt.assignment || !receipt.assignmentSha256) {
    throw new Error("Fixture requires an assigned event.");
  }
  return {
    assignmentId: receipt.assignment.assignmentId,
    assignmentSha256: receipt.assignmentSha256,
  };
};

const appendFixture = async (database: SQLiteD1) => {
  const repo = repository(database);
  const receipt = await repo.appendAssigned({
    actor,
    idempotencyKey: "integrity-append",
    expectedHead: null,
    envelope: envelope("integrity-assignment"),
  });
  database.database.exec(
    "DROP TRIGGER editorial_assignment_events_immutable_update",
  );
  return { repo, receipt };
};

const sha256Digest = async (raw: string): Promise<Sha256Digest> =>
  `sha256:${await sha256Hex(raw)}` as Sha256Digest;

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

const INSERT_COLUMNS = [
  "event_id",
  "stream_id",
  "sequence",
  "schema_version",
  "event_type",
  "content_version",
  "package_manifest_sha256",
  "item_catalog_sha256",
  "assignment_id",
  "assignment_sha256",
  "previous_assignment_id",
  "previous_assignment_sha256",
  "role",
  "assignee_operator_id",
  "envelope_json",
  "target_count",
  "actor_operator_id",
  "actor_credential_id",
  "idempotency_key",
  "request_sha256",
  "previous_event_id",
  "previous_event_sha256",
  "event_json",
  "event_sha256",
  "occurred_at",
] as const;

type SqlEventRow = Record<
  (typeof INSERT_COLUMNS)[number],
  string | number | null
>;

const utf8Bytes = (value: string) =>
  new TextEncoder().encode(value).byteLength;

const STORED_TEXT_COLUMNS: ReadonlyArray<keyof SqlEventRow> = [
  "event_id",
  "stream_id",
  "event_type",
  "content_version",
  "package_manifest_sha256",
  "item_catalog_sha256",
  "assignment_id",
  "assignment_sha256",
  "previous_assignment_id",
  "previous_assignment_sha256",
  "role",
  "assignee_operator_id",
  "envelope_json",
  "actor_operator_id",
  "actor_credential_id",
  "idempotency_key",
  "request_sha256",
  "previous_event_id",
  "previous_event_sha256",
  "event_json",
  "event_sha256",
] as const;

const storedRowBytes = (row: SqlEventRow) =>
  STORED_TEXT_COLUMNS.reduce((total, column) => {
    const value = row[column];
    return total + (value === null ? 0 : utf8Bytes(String(value)));
  }, 32);

const paddedJson = (byteLength: number) =>
  JSON.stringify("x".repeat(byteLength - 2));

describe("editorial assignment repository replay integrity", () => {
  it("rejects a forged request digest even when event JSON and its digest agree", async () => {
    const database = new SQLiteD1();
    const { repo, receipt } = await appendFixture(database);
    const stored = database.database.prepare(
      "SELECT event_json AS eventJson FROM editorial_assignment_events",
    ).get() as { eventJson: string };
    const eventValue = JSON.parse(stored.eventJson) as Record<string, unknown>;
    const forgedRequest = await sha256Digest("forged-request");
    eventValue.requestSha256 = forgedRequest;
    const forgedEventJson = canonicalStringify(eventValue);
    const forgedEventSha256 = await sha256Digest(forgedEventJson);
    database.database.prepare(
      `UPDATE editorial_assignment_events
       SET request_sha256 = ?, event_json = ?, event_sha256 = ?`,
    ).run(forgedRequest, forgedEventJson, forgedEventSha256);

    await expect(repo.list(receipt.stream)).rejects.toMatchObject({
      code: "EDITORIAL_ASSIGNMENT_INTEGRITY_ERROR",
      message: "Stored editorial request digest is invalid.",
    });
  });

  it("rejects a semantically unchanged but non-canonical envelope", async () => {
    const database = new SQLiteD1();
    const { repo, receipt } = await appendFixture(database);
    const stored = database.database.prepare(
      "SELECT envelope_json AS envelopeJson FROM editorial_assignment_events",
    ).get() as { envelopeJson: string };
    const nonCanonicalEnvelope = JSON.stringify(
      JSON.parse(stored.envelopeJson),
      null,
      2,
    );
    database.database.prepare(
      "UPDATE editorial_assignment_events SET envelope_json = ?",
    ).run(nonCanonicalEnvelope);

    await expect(repo.list(receipt.stream)).rejects
      .toBeInstanceOf(EditorialAssignmentIntegrityError);
  });

  it("rejects non-canonical event JSON even when its raw digest is updated", async () => {
    const database = new SQLiteD1();
    const { repo, receipt } = await appendFixture(database);
    const stored = database.database.prepare(
      "SELECT event_json AS eventJson FROM editorial_assignment_events",
    ).get() as { eventJson: string };
    const nonCanonicalEvent = JSON.stringify(
      JSON.parse(stored.eventJson),
      null,
      2,
    );
    database.database.prepare(
      `UPDATE editorial_assignment_events
       SET event_json = ?, event_sha256 = ?`,
    ).run(
      nonCanonicalEvent,
      await sha256Digest(nonCanonicalEvent),
    );

    await expect(repo.list(receipt.stream)).rejects.toMatchObject({
      code: "EDITORIAL_ASSIGNMENT_INTEGRITY_ERROR",
      message: "Stored editorial event canonical digest is invalid.",
    });
  });

  it("uses the SQLite trigger to reject an insert crossing the 16 MiB stream bound", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    let head: EditorialAssignmentHead | null = null;

    for (let index = 0; index < 9; index += 1) {
      const assigned = await repo.appendAssigned({
        actor,
        idempotencyKey: `size-assign-${index}`,
        expectedHead: head,
        envelope: envelope(
          `size-assignment-${index}`,
          `lexeme:size-${index}`,
        ),
      });
      head = headOf(assigned);
      const cancelled = await repo.cancel({
        actor,
        idempotencyKey: `size-cancel-${index}`,
        expectedHead: head,
        stream: assigned.stream,
        previousAssignment: referenceOf(assigned),
      });
      head = headOf(cancelled);
    }

    const candidate = database.database.prepare(
      "SELECT * FROM editorial_assignment_events WHERE sequence = 18",
    ).get() as SqlEventRow;
    database.database.exec(
      "DROP TRIGGER editorial_assignment_events_immutable_update",
    );
    database.database.exec(
      "DROP TRIGGER editorial_assignment_events_immutable_delete",
    );
    database.database.exec(
      "DELETE FROM editorial_assignment_events WHERE sequence = 18",
    );
    database.database.prepare(
      "UPDATE editorial_assignment_events SET event_json = ?",
    ).run(paddedJson(657_000));
    database.database.prepare(
      `UPDATE editorial_assignment_events
       SET envelope_json = ?
       WHERE envelope_json IS NOT NULL`,
    ).run(paddedJson(550_000));
    candidate.event_json = paddedJson(699_000);

    const stats = database.database.prepare(
      `SELECT COALESCE(SUM(${STORED_EVENT_BYTES_SQL}), 0) AS storedBytes
       FROM editorial_assignment_events
       WHERE stream_id = ?`,
    ).get(candidate.stream_id) as { storedBytes: number };
    expect(stats.storedBytes).toBeLessThan(
      EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT,
    );
    expect(stats.storedBytes + storedRowBytes(candidate)).toBeGreaterThan(
      EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT,
    );

    const placeholders = INSERT_COLUMNS.map(() => "?").join(", ");
    const values = INSERT_COLUMNS.map((column) => candidate[column]);
    expect(() => database.database.prepare(
      `INSERT INTO editorial_assignment_events (
        ${INSERT_COLUMNS.join(", ")}
      ) VALUES (${placeholders})`,
    ).run(...values)).toThrow(
      /editorial assignment stream exceeds byte bound/u,
    );
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM editorial_assignment_events",
    ).get()).toEqual({ count: 17 });
  });
});
