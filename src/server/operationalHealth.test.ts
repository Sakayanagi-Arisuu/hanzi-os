import { describe, expect, it, vi } from "vitest";
import {
  EXPECTED_ASSESSMENT_TERMINAL_INSERT_TRIGGER_SQL,
  EXPECTED_ASSESSMENT_TERMINAL_UPDATE_TRIGGER_SQL,
  EXPECTED_OUTBOX_LEASE_INDEX_COLUMNS,
  EXPECTED_OUTBOX_LEASE_INSERT_TRIGGER_SQL,
  EXPECTED_OUTBOX_LEASE_UPDATE_TRIGGER_SQL,
  OPERATIONAL_SCHEMA_SENTINEL_QUERY,
  operationalDatabaseIsReady,
} from "./operationalHealth";

const readyRow = {
  usersReady: 1,
  changesReady: 1,
  assessmentReady: 1,
  outboxLeaseTokenReady: 1,
  outboxLeaseExpiryReady: 1,
  assessmentTerminalReasonReady: 1,
  outboxLeaseIndexColumns: EXPECTED_OUTBOX_LEASE_INDEX_COLUMNS,
  outboxLeaseInsertTriggerSql: EXPECTED_OUTBOX_LEASE_INSERT_TRIGGER_SQL,
  outboxLeaseUpdateTriggerSql: EXPECTED_OUTBOX_LEASE_UPDATE_TRIGGER_SQL,
  assessmentTerminalInsertTriggerSql:
    EXPECTED_ASSESSMENT_TERMINAL_INSERT_TRIGGER_SQL,
  assessmentTerminalUpdateTriggerSql:
    EXPECTED_ASSESSMENT_TERMINAL_UPDATE_TRIGGER_SQL,
};

describe("operational D1 readiness", () => {
  it("requires exact durable, change-feed, assessment, and outbox sentinels", async () => {
    const first = vi.fn().mockResolvedValue(readyRow);
    const prepare = vi.fn(() => ({ first }));

    await expect(operationalDatabaseIsReady({ prepare } as never))
      .resolves.toBe(true);
    expect(prepare).toHaveBeenCalledWith(OPERATIONAL_SCHEMA_SENTINEL_QUERY);
  });

  it.each(Object.keys(readyRow))(
    "fails closed when sentinel %s is missing or structurally wrong",
    async (field) => {
      const current = readyRow[field as keyof typeof readyRow];
      const row = {
        ...readyRow,
        [field]: typeof current === "number" ? 0 : "wrong-or-no-op",
      };
      const database = {
        prepare: () => ({ first: vi.fn().mockResolvedValue(row) }),
      };

      await expect(operationalDatabaseIsReady(database as never))
        .resolves.toBe(false);
    },
  );

  it("fails closed when the sentinel query returns no row", async () => {
    const database = {
      prepare: () => ({ first: vi.fn().mockResolvedValue(null) }),
    };
    await expect(operationalDatabaseIsReady(database as never))
      .resolves.toBe(false);
  });
});
