import type { D1Database } from "./d1";

export const EXPECTED_OUTBOX_LEASE_INDEX_COLUMNS =
  "status,lease_expires_at";

export const EXPECTED_OUTBOX_LEASE_INSERT_TRIGGER_SQL = `
CREATE TRIGGER \`outbox_events_lease_state_insert\`
BEFORE INSERT ON \`outbox_events\`
WHEN (
  NEW.\`status\` = 'processing'
  AND (
    NEW.\`lease_token\` IS NULL
    OR NEW.\`lease_expires_at\` IS NULL
    OR NEW.\`lease_expires_at\` < 0
  )
) OR (
  NEW.\`status\` <> 'processing'
  AND (
    NEW.\`lease_token\` IS NOT NULL
    OR NEW.\`lease_expires_at\` IS NOT NULL
  )
)
BEGIN
  SELECT RAISE(ABORT, 'outbox event lease state is invalid');
END
`;

export const EXPECTED_OUTBOX_LEASE_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER \`outbox_events_lease_state_update\`
BEFORE UPDATE OF \`status\`, \`lease_token\`, \`lease_expires_at\` ON \`outbox_events\`
WHEN (
  NEW.\`status\` = 'processing'
  AND (
    NEW.\`lease_token\` IS NULL
    OR NEW.\`lease_expires_at\` IS NULL
    OR NEW.\`lease_expires_at\` < 0
  )
) OR (
  NEW.\`status\` <> 'processing'
  AND (
    NEW.\`lease_token\` IS NOT NULL
    OR NEW.\`lease_expires_at\` IS NOT NULL
  )
)
BEGIN
  SELECT RAISE(ABORT, 'outbox event lease state is invalid');
END
`;

export const EXPECTED_ASSESSMENT_TERMINAL_INSERT_TRIGGER_SQL = `
CREATE TRIGGER \`assessment_sessions_terminal_reason_insert\`
BEFORE INSERT ON \`assessment_sessions\`
WHEN (
  NEW.\`status\` = 'abandoned'
  AND (
    NEW.\`terminal_reason\` IS NULL
    OR NEW.\`terminal_reason\` NOT IN ('user-abandoned', 'reset-invalidated')
  )
) OR (
  NEW.\`status\` <> 'abandoned'
  AND NEW.\`terminal_reason\` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'assessment session terminal reason is invalid');
END
`;

export const EXPECTED_ASSESSMENT_TERMINAL_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER \`assessment_sessions_terminal_reason_update\`
BEFORE UPDATE OF \`status\`, \`terminal_reason\` ON \`assessment_sessions\`
WHEN (
  NEW.\`status\` = 'abandoned'
  AND (
    NEW.\`terminal_reason\` IS NULL
    OR NEW.\`terminal_reason\` NOT IN ('user-abandoned', 'reset-invalidated')
  )
) OR (
  NEW.\`status\` <> 'abandoned'
  AND NEW.\`terminal_reason\` IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'assessment session terminal reason is invalid');
END
`;

export const OPERATIONAL_SCHEMA_SENTINEL_QUERY = [
  "SELECT",
  "EXISTS(SELECT 1 FROM sqlite_master",
  "WHERE type = 'table' AND name = 'users') AS usersReady,",
  "EXISTS(SELECT 1 FROM sqlite_master",
  "WHERE type = 'table' AND name = 'sync_changes') AS changesReady,",
  "EXISTS(SELECT 1 FROM sqlite_master",
  "WHERE type = 'table' AND name = 'assessment_skill_results') AS assessmentReady,",
  "EXISTS(SELECT 1 FROM pragma_table_info('outbox_events')",
  "WHERE name = 'lease_token') AS outboxLeaseTokenReady,",
  "EXISTS(SELECT 1 FROM pragma_table_info('outbox_events')",
  "WHERE name = 'lease_expires_at') AS outboxLeaseExpiryReady,",
  "EXISTS(SELECT 1 FROM pragma_table_info('assessment_sessions')",
  "WHERE name = 'terminal_reason') AS assessmentTerminalReasonReady,",
  "(SELECT group_concat(index_column.name, ',')",
  "FROM (SELECT name FROM pragma_index_info(",
  "'outbox_events_status_lease_expiry_idx')",
  "ORDER BY seqno) index_column) AS outboxLeaseIndexColumns,",
  "(SELECT sql FROM sqlite_master",
  "WHERE type = 'trigger'",
  "AND name = 'outbox_events_lease_state_insert') AS outboxLeaseInsertTriggerSql,",
  "(SELECT sql FROM sqlite_master",
  "WHERE type = 'trigger'",
  "AND name = 'outbox_events_lease_state_update') AS outboxLeaseUpdateTriggerSql,",
  "(SELECT sql FROM sqlite_master",
  "WHERE type = 'trigger'",
  "AND name = 'assessment_sessions_terminal_reason_insert')",
  "AS assessmentTerminalInsertTriggerSql,",
  "(SELECT sql FROM sqlite_master",
  "WHERE type = 'trigger'",
  "AND name = 'assessment_sessions_terminal_reason_update')",
  "AS assessmentTerminalUpdateTriggerSql",
].join(" ");

type OperationalSchemaSentinelRow = {
  usersReady: number;
  changesReady: number;
  assessmentReady: number;
  outboxLeaseTokenReady: number;
  outboxLeaseExpiryReady: number;
  assessmentTerminalReasonReady: number;
  outboxLeaseIndexColumns: string | null;
  outboxLeaseInsertTriggerSql: string | null;
  outboxLeaseUpdateTriggerSql: string | null;
  assessmentTerminalInsertTriggerSql: string | null;
  assessmentTerminalUpdateTriggerSql: string | null;
};

export const normalizeOperationalSchemaSql = (value: unknown) => {
  if (typeof value !== "string") return null;
  return value
    .trim()
    .replace(/;+\s*$/u, "")
    .replaceAll("`", "\"")
    .replace(/\s+/gu, " ")
    .toLowerCase();
};

export async function operationalDatabaseIsReady(database: D1Database) {
  const row = await database
    .prepare(OPERATIONAL_SCHEMA_SENTINEL_QUERY)
    .first<OperationalSchemaSentinelRow>();
  return row?.usersReady === 1
    && row.changesReady === 1
    && row.assessmentReady === 1
    && row.outboxLeaseTokenReady === 1
    && row.outboxLeaseExpiryReady === 1
    && row.assessmentTerminalReasonReady === 1
    && row.outboxLeaseIndexColumns === EXPECTED_OUTBOX_LEASE_INDEX_COLUMNS
    && normalizeOperationalSchemaSql(row.outboxLeaseInsertTriggerSql)
      === normalizeOperationalSchemaSql(
        EXPECTED_OUTBOX_LEASE_INSERT_TRIGGER_SQL,
      )
    && normalizeOperationalSchemaSql(row.outboxLeaseUpdateTriggerSql)
      === normalizeOperationalSchemaSql(
        EXPECTED_OUTBOX_LEASE_UPDATE_TRIGGER_SQL,
      )
    && normalizeOperationalSchemaSql(row.assessmentTerminalInsertTriggerSql)
      === normalizeOperationalSchemaSql(
        EXPECTED_ASSESSMENT_TERMINAL_INSERT_TRIGGER_SQL,
      )
    && normalizeOperationalSchemaSql(row.assessmentTerminalUpdateTriggerSql)
      === normalizeOperationalSchemaSql(
        EXPECTED_ASSESSMENT_TERMINAL_UPDATE_TRIGGER_SQL,
      );
}
