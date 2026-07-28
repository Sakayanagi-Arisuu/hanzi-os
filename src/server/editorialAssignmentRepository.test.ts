import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  EditorialAssignmentEnvelope,
  ReviewRole,
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
  EditorialAssignmentHeadConflictError,
  EditorialAssignmentIdempotencyConflictError,
  EditorialAssignmentRepository,
  EditorialAssignmentStorageError,
  EditorialAssignmentTargetConflictError,
  EditorialAssignmentTransitionConflictError,
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

type QueryHook = {
  pattern: RegExp;
  run: () => void | Promise<void>;
};

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];

  constructor(
    private readonly statement: StatementSync,
    private readonly query: string,
    private readonly beforeExecute: (query: string) => Promise<void>,
  ) {}

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
    await this.beforeExecute(this.query);
    const row = this.statement.get(...this.sqliteParameters()) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    await this.beforeExecute(this.query);
    return {
      success: true,
      results: this.statement.all(...this.sqliteParameters()) as T[],
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    await this.beforeExecute(this.query);
    if (/^\s*SELECT\b/iu.test(this.query)) return this.all<T>();
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
  queryHook: QueryHook | null = null;
  beforeNextBatch: (() => void | Promise<void>) | null = null;
  failNextBatch = false;

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migration);
  }

  private beforeExecute = async (query: string) => {
    const hook = this.queryHook;
    if (hook && hook.pattern.test(query)) {
      this.queryHook = null;
      await hook.run();
    }
  };

  prepare(query: string) {
    return new SQLiteStatement(
      this.database.prepare(query),
      query,
      this.beforeExecute,
    );
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    const beforeBatch = this.beforeNextBatch;
    this.beforeNextBatch = null;
    await beforeBatch?.();
    if (this.failNextBatch) {
      this.failNextBatch = false;
      throw new Error("simulated D1 transport failure");
    }
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
const MANIFEST =
  `sha256:${"a".repeat(64)}` as Sha256Digest;
const CATALOG =
  `sha256:${"b".repeat(64)}` as Sha256Digest;
const actor: EditorialAssignmentActor = {
  operatorId: "editorial-operator",
  credentialId: "credential-one",
};

const envelope = ({
  assignmentId,
  role = "content-owner",
  assigneeOperatorId = "reviewer-one",
  assignedByOperatorId = actor.operatorId,
  assignedAt = new Date(NOW).toISOString(),
  itemKeys = ["lexeme:ni"],
  audioAssetIds = [],
}: {
  assignmentId: string;
  role?: ReviewRole;
  assigneeOperatorId?: string;
  assignedByOperatorId?: string;
  assignedAt?: string;
  itemKeys?: EditorialAssignmentEnvelope["scope"]["itemKeys"];
  audioAssetIds?: string[];
}): EditorialAssignmentEnvelope => ({
  schemaVersion: 1,
  assignmentId,
  contentVersion: "foundation-2026.07.6",
  packageManifestSha256: MANIFEST,
  itemCatalogSha256: CATALOG,
  role,
  assignedByOperatorId,
  assigneeOperatorId,
  assignedAt,
  scope: { itemKeys, audioAssetIds },
});

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

const repository = (
  database: SQLiteD1,
  prefix = "event",
) => {
  let sequence = 0;
  return new EditorialAssignmentRepository(database, {
    now: () => NOW,
    eventId: () => `${prefix}-${++sequence}`,
  });
};

describe("editorial assignment repository", () => {
  it("appends, reads, and replays a canonical assignment idempotently", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    const command = {
      actor,
      idempotencyKey: "assign-one",
      expectedHead: null,
      envelope: envelope({ assignmentId: "assignment-one" }),
    };

    const created = await repo.appendAssigned(command);
    const retry = await repo.appendAssigned({
      ...command,
      actor: { ...actor, credentialId: "rotated-credential" },
      envelope: {
        ...command.envelope,
        assignedAt: new Date(NOW - 1_000).toISOString(),
      },
    });
    const state = await repo.list({
      contentVersion: command.envelope.contentVersion,
      packageManifestSha256: MANIFEST,
      itemCatalogSha256: CATALOG,
    });

    expect(created.duplicate).toBe(false);
    expect(retry).toMatchObject({
      eventId: created.eventId,
      eventSha256: created.eventSha256,
      duplicate: true,
      actor,
      assignment: command.envelope,
    });
    expect(state.events).toHaveLength(1);
    expect(state.activeAssignments).toEqual([{
      assignment: command.envelope,
      assignmentSha256: created.assignmentSha256,
    }]);
    expect(await repo.read(created.eventId)).toMatchObject({
      eventId: created.eventId,
      eventSha256: created.eventSha256,
    });
  });

  it("rejects a changed stable intent under the same operator/key", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    const command = {
      actor,
      idempotencyKey: "stable-intent",
      expectedHead: null,
      envelope: envelope({ assignmentId: "stable-assignment" }),
    };
    await repo.appendAssigned(command);

    await expect(repo.appendAssigned({
      ...command,
      envelope: {
        ...command.envelope,
        assigneeOperatorId: "different-reviewer",
      },
    })).rejects.toBeInstanceOf(
      EditorialAssignmentIdempotencyConflictError,
    );
  });

  it("serializes roles globally, rejects overlap, and supports reassign/cancel/reclaim", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    const owner = await repo.appendAssigned({
      actor,
      idempotencyKey: "owner-one",
      expectedHead: null,
      envelope: envelope({ assignmentId: "owner-one" }),
    });
    const native = await repo.appendAssigned({
      actor,
      idempotencyKey: "native-one",
      expectedHead: headOf(owner),
      envelope: envelope({
        assignmentId: "native-one",
        role: "native-linguistic",
      }),
    });

    await expect(repo.appendAssigned({
      actor,
      idempotencyKey: "owner-overlap",
      expectedHead: headOf(native),
      envelope: envelope({ assignmentId: "owner-overlap" }),
    })).rejects.toBeInstanceOf(EditorialAssignmentTargetConflictError);

    const reassigned = await repo.reassign({
      actor,
      idempotencyKey: "owner-reassign",
      expectedHead: headOf(native),
      previousAssignment: referenceOf(owner),
      envelope: envelope({
        assignmentId: "owner-two",
        assigneeOperatorId: "reviewer-two",
      }),
    });
    const cancelled = await repo.cancel({
      actor,
      idempotencyKey: "owner-cancel",
      expectedHead: headOf(reassigned),
      stream: reassigned.stream,
      previousAssignment: referenceOf(reassigned),
    });

    await expect(repo.appendAssigned({
      actor,
      idempotencyKey: "reuse-retired-id",
      expectedHead: headOf(cancelled),
      envelope: envelope({ assignmentId: "owner-one" }),
    })).rejects.toBeInstanceOf(EditorialAssignmentTransitionConflictError);

    const reclaimed = await repo.appendAssigned({
      actor,
      idempotencyKey: "owner-reclaim",
      expectedHead: headOf(cancelled),
      envelope: envelope({ assignmentId: "owner-three" }),
    });
    const state = await repo.list(reclaimed.stream);
    expect(state.events.map((event) => event.eventType)).toEqual([
      "assigned",
      "assigned",
      "reassigned",
      "cancelled",
      "assigned",
    ]);
    expect(state.activeAssignments.map(({ assignment }) =>
      assignment.assignmentId
    ).sort()).toEqual(["native-one", "owner-three"]);
  });

  it("returns the same winner when an identical operation commits during replay", async () => {
    const database = new SQLiteD1();
    const loser = repository(database, "loser");
    const winner = repository(database, "winner");
    const command = {
      actor,
      idempotencyKey: "replay-race",
      expectedHead: null,
      envelope: envelope({ assignmentId: "race-assignment" }),
    };
    const committed: EditorialAssignmentAppendReceipt[] = [];
    database.queryHook = {
      pattern: /COUNT\(\*\) AS eventCount/u,
      run: async () => {
        committed.push(await winner.appendAssigned(command));
      },
    };

    const result = await loser.appendAssigned(command);

    expect(result.duplicate).toBe(true);
    expect(result.eventId).toBe(committed[0]?.eventId);
  });

  it("classifies a competing different append as a head conflict", async () => {
    const database = new SQLiteD1();
    const loser = repository(database, "loser");
    const winner = repository(database, "winner");
    const losingCommand = {
      actor,
      idempotencyKey: "losing-race",
      expectedHead: null,
      envelope: envelope({
        assignmentId: "losing-assignment",
        itemKeys: ["lexeme:yi"],
      }),
    };
    database.beforeNextBatch = async () => {
      await winner.appendAssigned({
        actor,
        idempotencyKey: "winning-race",
        expectedHead: null,
        envelope: envelope({
          assignmentId: "winning-assignment",
          itemKeys: ["lexeme:er"],
        }),
      });
    };

    await expect(loser.appendAssigned(losingCommand)).rejects
      .toBeInstanceOf(EditorialAssignmentHeadConflictError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM editorial_assignment_events",
    ).get()).toEqual({ count: 1 });
  });

  it("does not relabel an unknown D1 failure as a CAS conflict", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    database.failNextBatch = true;

    await expect(repo.appendAssigned({
      actor,
      idempotencyKey: "storage-failure",
      expectedHead: null,
      envelope: envelope({ assignmentId: "storage-failure" }),
    })).rejects.toBeInstanceOf(EditorialAssignmentStorageError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM editorial_assignment_events",
    ).get()).toEqual({ count: 0 });
  });

  it("rolls back every statement when an append-only guard aborts a batch", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    const created = await repo.appendAssigned({
      actor,
      idempotencyKey: "rollback-fixture",
      expectedHead: null,
      envelope: envelope({ assignmentId: "rollback-fixture" }),
    });

    await expect(database.batch([
      database.prepare(
        `INSERT INTO course_versions (
          id, course_id, schema_version, manifest_hash, release_state,
          linguistic_review_status, created_at
        ) VALUES (
          'rollback-marker', 'rollback-course', 1, 'rollback-hash', 'review',
          'pending', 1
        )`,
      ),
      database.prepare(
        "UPDATE editorial_assignment_events SET occurred_at = occurred_at + 1 WHERE event_id = ?",
      ).bind(created.eventId),
    ])).rejects.toThrow(/events are immutable/u);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM course_versions WHERE id = 'rollback-marker'",
    ).get()).toEqual({ count: 0 });
  });

  it("keeps the 10,000-target E2 count while enforcing UTF-8 row bounds", async () => {
    const acceptedDatabase = new SQLiteD1();
    const accepted = repository(acceptedDatabase);
    const exactMaximum = Array.from(
      { length: 10_000 },
      (_, index) => `lexeme:t${String(index).padStart(5, "0")}`,
    ) as EditorialAssignmentEnvelope["scope"]["itemKeys"];
    const receipt = await accepted.appendAssigned({
      actor,
      idempotencyKey: "target-count-maximum",
      expectedHead: null,
      envelope: envelope({
        assignmentId: "target-count-maximum",
        itemKeys: exactMaximum,
      }),
    });
    expect(receipt.targetCount).toBe(10_000);

    const rejectedDatabase = new SQLiteD1();
    const rejected = repository(rejectedDatabase);
    const multibyteTargets = Array.from(
      { length: 4_500 },
      (_, index) =>
        `lexeme:${String(index).padStart(5, "0")}-${"界".repeat(45)}`,
    ) as EditorialAssignmentEnvelope["scope"]["itemKeys"];
    await expect(rejected.appendAssigned({
      actor,
      idempotencyKey: "utf8-too-large",
      expectedHead: null,
      envelope: envelope({
        assignmentId: "utf8-too-large",
        itemKeys: multibyteTargets,
      }),
    })).rejects.toThrow(/UTF-8 safety bound/u);
    expect(rejectedDatabase.database.prepare(
      "SELECT COUNT(*) AS count FROM editorial_assignment_events",
    ).get()).toEqual({ count: 0 });
  });

  it("verifies the stored request before classifying an idempotent retry", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    const command = {
      actor,
      idempotencyKey: "tampered-request",
      expectedHead: null,
      envelope: envelope({ assignmentId: "tampered-request" }),
    };
    await repo.appendAssigned(command);
    database.database.exec(
      "DROP TRIGGER editorial_assignment_events_immutable_update",
    );
    const stored = database.database.prepare(
      "SELECT event_json AS eventJson FROM editorial_assignment_events",
    ).get() as { eventJson: string };
    const eventValue = JSON.parse(stored.eventJson) as Record<string, unknown>;
    const tamperedRequestSha256 = `sha256:${"f".repeat(64)}`;
    eventValue.requestSha256 = tamperedRequestSha256;
    const tamperedEventJson = canonicalStringify(eventValue);
    const tamperedEventSha256 =
      `sha256:${await sha256Hex(tamperedEventJson)}`;
    database.database.prepare(
      `UPDATE editorial_assignment_events
       SET request_sha256 = ?, event_json = ?, event_sha256 = ?`,
    ).run(
      tamperedRequestSha256,
      tamperedEventJson,
      tamperedEventSha256,
    );

    await expect(repo.appendAssigned(command)).rejects
      .toThrow(/request digest is invalid/u);
  });

  it("rejects a stored transition shape even if database checks are bypassed", async () => {
    const database = new SQLiteD1();
    const repo = repository(database);
    const created = await repo.appendAssigned({
      actor,
      idempotencyKey: "shape-tamper",
      expectedHead: null,
      envelope: envelope({ assignmentId: "shape-tamper" }),
    });
    database.database.exec(
      "DROP TRIGGER editorial_assignment_events_immutable_update",
    );
    database.database.exec("PRAGMA ignore_check_constraints = ON");
    database.database.prepare(
      "UPDATE editorial_assignment_events SET event_type = 'cancelled' WHERE event_id = ?",
    ).run(created.eventId);

    await expect(repo.list(created.stream)).rejects
      .toThrow(/transition shape/u);
  });

  it("enforces Date and sequence bounds in both repository and schema", async () => {
    const invalidClock = new SQLiteD1();
    const invalidClockRepo = new EditorialAssignmentRepository(invalidClock, {
      now: () => 8_640_000_000_000_001,
      eventId: () => "invalid-clock-event",
    });
    await expect(invalidClockRepo.appendAssigned({
      actor,
      idempotencyKey: "invalid-clock",
      expectedHead: null,
      envelope: envelope({ assignmentId: "invalid-clock" }),
    })).rejects.toThrow(/clock is invalid/u);

    const database = new SQLiteD1();
    const repo = repository(database);
    const created = await repo.appendAssigned({
      actor,
      idempotencyKey: "schema-bounds",
      expectedHead: null,
      envelope: envelope({ assignmentId: "schema-bounds" }),
    });
    database.database.exec(
      "DROP TRIGGER editorial_assignment_events_immutable_update",
    );
    expect(() => database.database.prepare(
      "UPDATE editorial_assignment_events SET sequence = 10001 WHERE event_id = ?",
    ).run(created.eventId)).toThrow(
      /editorial_assignment_events_sequence_check/u,
    );
    expect(() => database.database.prepare(
      "UPDATE editorial_assignment_events SET occurred_at = 8640000000000001 WHERE event_id = ?",
    ).run(created.eventId)).toThrow(
      /editorial_assignment_events_time_check/u,
    );
  });

  it("fails before fetching an aggregate stream beyond the Worker read budget", async () => {
    let fullReadAttempted = false;
    const oversizedStatement: D1PreparedStatement = {
      bind() {
        return this;
      },
      async first<T>() {
        return {
          eventCount: 1,
          storedBytes:
            EDITORIAL_ASSIGNMENT_STREAM_STORED_UTF8_LIMIT + 1,
        } as T;
      },
      async all<T>() {
        fullReadAttempted = true;
        return { success: true, results: [] as T[] };
      },
      async run<T>() {
        return { success: true, results: [] as T[] };
      },
    };
    const oversizedDatabase: D1Database = {
      prepare: () => oversizedStatement,
      batch: async () => [],
    };
    const repo = new EditorialAssignmentRepository(oversizedDatabase);
    const stream = {
      contentVersion: "foundation-2026.07.6",
      packageManifestSha256: MANIFEST,
      itemCatalogSha256: CATALOG,
    };

    await expect(repo.list(stream)).rejects
      .toThrow(/bounded read budget/u);
    expect(fullReadAttempted).toBe(false);
  });
});
