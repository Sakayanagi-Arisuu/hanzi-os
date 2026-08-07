import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull().default("active"),
    controlRevision: integer("control_revision").notNull().default(1),
    lockedAt: integer("locked_at"),
    lockedByUserId: text("locked_by_user_id"),
    lockReason: text("lock_reason"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    check(
      "users_status_check",
      sql`${table.status} IN ('active', 'locked', 'deletion_pending', 'deleted')`,
    ),
    check("users_control_revision_check", sql`${table.controlRevision} > 0`),
    check(
      "users_lock_state_check",
      sql`(
        ${table.status} = 'locked'
        AND ${table.lockedAt} IS NOT NULL
        AND ${table.lockedByUserId} IS NOT NULL
        AND ${table.lockReason} IS NOT NULL
      ) OR (
        ${table.status} <> 'locked'
        AND ${table.lockedAt} IS NULL
        AND ${table.lockedByUserId} IS NULL
        AND ${table.lockReason} IS NULL
      )`,
    ),
    index("users_status_idx").on(table.status),
  ],
);

export const authIdentities = sqliteTable(
  "auth_identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    normalizedEmail: text("normalized_email"),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("auth_identities_provider_subject_uidx").on(
      table.provider,
      table.providerSubject,
    ),
    index("auth_identities_user_idx").on(table.userId),
  ],
);

/**
 * First-party application sessions. Only a SHA-256 digest of the opaque cookie
 * is persisted; the bearer value itself is never stored in D1 or browser
 * storage. ChatGPT-hosted identity headers remain a compatibility provider and
 * do not need a row here until the user links another sign-in method.
 */
export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    identityId: text("identity_id").references(() => authIdentities.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull(),
    authMethod: text("auth_method").notNull(),
    deviceLabel: text("device_label"),
    userAgentHash: text("user_agent_hash"),
    authenticatedAt: integer("authenticated_at").notNull(),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_uidx").on(table.tokenHash),
    uniqueIndex("auth_sessions_user_id_uidx").on(table.userId, table.id),
    index("auth_sessions_user_last_seen_idx").on(table.userId, table.lastSeenAt),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
    check(
      "auth_sessions_method_check",
      sql`${table.authMethod} IN ('google', 'email_otp', 'passkey')`,
    ),
    check(
      "auth_sessions_time_check",
      sql`${table.authenticatedAt} <= ${table.createdAt}
        AND ${table.createdAt} <= ${table.lastSeenAt}
        AND ${table.lastSeenAt} <= ${table.expiresAt}
        AND (${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt})`,
    ),
  ],
);

/** Short-lived, single-use state for OAuth, email OTP and WebAuthn ceremonies. */
export const authChallenges = sqliteTable(
  "auth_challenges",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    provider: text("provider").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    challengeHash: text("challenge_hash").notNull(),
    secretHash: text("secret_hash"),
    payloadJson: text("payload_json").notNull().default("{}"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: integer("consumed_at"),
  },
  (table) => [
    uniqueIndex("auth_challenges_challenge_hash_uidx").on(table.challengeHash),
    index("auth_challenges_expiry_idx").on(table.expiresAt),
    index("auth_challenges_user_idx").on(table.userId, table.createdAt),
    check(
      "auth_challenges_kind_check",
      sql`${table.kind} IN (
        'google_signin', 'google_link', 'google_unlink',
        'email_signin', 'email_link', 'email_unlink',
        'passkey_register', 'passkey_signin', 'passkey_unlink'
      )`,
    ),
    check(
      "auth_challenges_provider_check",
      sql`${table.provider} IN ('google', 'email_otp', 'passkey')`,
    ),
    check(
      "auth_challenges_attempts_check",
      sql`${table.attempts} BETWEEN 0 AND 5`,
    ),
    check(
      "auth_challenges_json_check",
      sql`json_valid(${table.payloadJson})`,
    ),
    check(
      "auth_challenges_time_check",
      sql`${table.createdAt} < ${table.expiresAt}
        AND (${table.consumedAt} IS NULL OR ${table.consumedAt} >= ${table.createdAt})`,
    ),
  ],
);

/** Public-key material and counters for passkeys. Private keys stay on device. */
export const passkeyCredentials = sqliteTable(
  "passkey_credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    identityId: text("identity_id")
      .notNull()
      .references(() => authIdentities.id, { onDelete: "cascade" }),
    publicKeyJwkJson: text("public_key_jwk_json").notNull(),
    algorithm: integer("algorithm").notNull(),
    signCount: integer("sign_count").notNull().default(0),
    transportsJson: text("transports_json").notNull().default("[]"),
    label: text("label"),
    backupEligible: integer("backup_eligible", { mode: "boolean" })
      .notNull()
      .default(false),
    backupState: integer("backup_state", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull(),
    lastUsedAt: integer("last_used_at"),
  },
  (table) => [
    uniqueIndex("passkey_credentials_identity_uidx").on(table.identityId),
    uniqueIndex("passkey_credentials_user_id_uidx").on(table.userId, table.id),
    index("passkey_credentials_user_idx").on(table.userId, table.createdAt),
    check(
      "passkey_credentials_algorithm_check",
      sql`${table.algorithm} IN (-7, -257)`,
    ),
    check(
      "passkey_credentials_sign_count_check",
      sql`${table.signCount} BETWEEN 0 AND 4294967295`,
    ),
    check(
      "passkey_credentials_json_check",
      sql`json_valid(${table.publicKeyJwkJson}) AND json_valid(${table.transportsJson})`,
    ),
  ],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    grantedByUserId: text("granted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    grantedAt: integer("granted_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({
      name: "user_roles_pk",
      columns: [table.userId, table.role],
    }),
    index("user_roles_role_idx").on(table.role),
    index("user_roles_granted_by_idx").on(table.grantedByUserId),
    check(
      "user_roles_role_check",
      sql`${table.role} IN ('learner', 'content_editor', 'admin')`,
    ),
  ],
);

/** Runtime-safe operational settings. Secret-shaped keys are not allowlisted. */
export const systemSettings = sqliteTable(
  "system_settings",
  {
    key: text("key").primaryKey(),
    valueJson: text("value_json").notNull(),
    revision: integer("revision").notNull().default(1),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "system_settings_key_check",
      sql`${table.key} IN (
        'account_registration_mode',
        'content_preview_enabled',
        'default_daily_minutes',
        'maintenance_banner'
      )`,
    ),
    check("system_settings_value_json_check", sql`json_valid(${table.valueJson})`),
    check("system_settings_revision_check", sql`${table.revision} > 0`),
    check(
      "system_settings_time_check",
      sql`${table.createdAt} <= ${table.updatedAt}`,
    ),
  ],
);

/** Append-only security and governance trail; migration triggers reject mutation. */
export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    actorUserId: text("actor_user_id"),
    actorSessionId: text("actor_session_id"),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    requestId: text("request_id").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("audit_events_request_action_uidx").on(
      table.requestId,
      table.action,
      table.targetType,
      table.targetId,
    ),
    index("audit_events_created_idx").on(table.createdAt, table.id),
    index("audit_events_actor_idx").on(table.actorUserId, table.createdAt),
    index("audit_events_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
    check(
      "audit_events_category_check",
      sql`${table.category} IN (
        'auth', 'account', 'role', 'config', 'approval', 'publication'
      )`,
    ),
    check(
      "audit_events_outcome_check",
      sql`${table.outcome} IN ('success', 'denied', 'failed')`,
    ),
    check("audit_events_metadata_json_check", sql`json_valid(${table.metadataJson})`),
    check("audit_events_action_check", sql`length(${table.action}) BETWEEN 3 AND 120`),
    check("audit_events_target_type_check", sql`length(${table.targetType}) BETWEEN 2 AND 80`),
  ],
);

export const profiles = sqliteTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    goal: text("goal").notNull(),
    dailyMinutes: integer("daily_minutes").notNull(),
    script: text("script").notNull(),
    startingLevel: text("starting_level").notNull(),
    onboarded: integer("onboarded", { mode: "boolean" })
      .notNull()
      .default(false),
    revision: integer("revision").notNull().default(1),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check(
      "profiles_goal_check",
      sql`${table.goal} IN ('conversation', 'hsk', 'career', 'travel')`,
    ),
    check(
      "profiles_daily_minutes_check",
      sql`${table.dailyMinutes} IN (10, 20, 30)`,
    ),
    check(
      "profiles_script_check",
      sql`${table.script} IN ('simplified', 'traditional')`,
    ),
    check(
      "profiles_starting_level_check",
      sql`${table.startingLevel} IN ('zero', 'basic', 'hsk1', 'hsk2', 'hsk3', 'hsk4')`,
    ),
    check("profiles_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const devices = sqliteTable(
  "devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    installationId: text("installation_id").notNull(),
    label: text("label"),
    platform: text("platform"),
    lastAckedCursor: integer("last_acked_cursor").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [
    uniqueIndex("devices_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("devices_user_installation_uidx").on(
      table.userId,
      table.installationId,
    ),
    index("devices_user_last_seen_idx").on(table.userId, table.lastSeenAt),
    check(
      "devices_last_acked_cursor_check",
      sql`${table.lastAckedCursor} >= 0`,
    ),
  ],
);

/**
 * Persistent counters for authenticated server-side mutation policies.
 *
 * The current product's tenant boundary is the authenticated user. Scope and
 * policy version are server constants; request input must never choose either.
 * Keeping one row per policy avoids an unbounded row per fixed window.
 */
export const mutationRateLimits = sqliteTable(
  "mutation_rate_limits",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    policyVersion: text("policy_version").notNull(),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({
      name: "mutation_rate_limits_pk",
      columns: [table.userId, table.scope, table.policyVersion],
    }),
    index("mutation_rate_limits_updated_idx").on(table.updatedAt),
    check(
      "mutation_rate_limits_window_start_check",
      sql`${table.windowStart} >= 0`,
    ),
    check(
      "mutation_rate_limits_request_count_check",
      sql`${table.requestCount} >= 1`,
    ),
    check(
      "mutation_rate_limits_scope_check",
      sql`length(${table.scope}) BETWEEN 1 AND 120`,
    ),
    check(
      "mutation_rate_limits_policy_version_check",
      sql`length(${table.policyVersion}) BETWEEN 1 AND 80`,
    ),
  ],
);

export const courseVersions = sqliteTable(
  "course_versions",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    releaseState: text("release_state").notNull(),
    linguisticReviewStatus: text("linguistic_review_status")
      .notNull()
      .default("pending"),
    createdAt: integer("created_at").notNull(),
    publishedAt: integer("published_at"),
    retiredAt: integer("retired_at"),
  },
  (table) => [
    index("course_versions_course_release_idx").on(
      table.courseId,
      table.releaseState,
    ),
    check(
      "course_versions_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "course_versions_release_state_check",
      sql`${table.releaseState} IN ('draft', 'review', 'beta', 'published', 'retired')`,
    ),
    check(
      "course_versions_linguistic_review_status_check",
      sql`${table.linguisticReviewStatus} IN ('pending', 'approved', 'rejected')`,
    ),
  ],
);

/**
 * CMS-lite authoring records. These tables govern only revisions created in
 * Content Studio; the checked-in package pipeline remains the source for the
 * existing HSK0-4 release until a Studio revision is explicitly published.
 */
export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    stableKey: text("stable_key").notNull(),
    itemType: text("item_type").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("content_items_stable_key_uidx").on(table.stableKey),
    index("content_items_type_updated_idx").on(table.itemType, table.updatedAt),
    check(
      "content_items_type_check",
      sql`${table.itemType} IN ('vocabulary', 'character', 'grammar', 'lesson', 'exam_item')`,
    ),
    check(
      "content_items_stable_key_check",
      sql`length(${table.stableKey}) BETWEEN 3 AND 160
        AND ${table.stableKey} NOT GLOB '*[^a-z0-9._:-]*'`,
    ),
  ],
);

export const contentRevisions = sqliteTable(
  "content_revisions",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    workflowState: text("workflow_state").notNull().default("draft"),
    title: text("title").notNull(),
    level: text("level").notNull(),
    contentJson: text("content_json").notNull(),
    contentSha256: text("content_sha256").notNull(),
    validationJson: text("validation_json"),
    validationSha256: text("validation_sha256"),
    basedOnRevisionId: text("based_on_revision_id"),
    rowVersion: integer("row_version").notNull().default(1),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    publishedAt: integer("published_at"),
    archivedAt: integer("archived_at"),
  },
  (table) => [
    uniqueIndex("content_revisions_item_revision_uidx").on(
      table.itemId,
      table.revision,
    ),
    uniqueIndex("content_revisions_one_published_uidx")
      .on(table.itemId)
      .where(sql`${table.workflowState} = 'published'`),
    index("content_revisions_state_type_idx").on(
      table.workflowState,
      table.level,
    ),
    foreignKey({
      name: "content_revisions_based_on_fk",
      columns: [table.basedOnRevisionId],
      foreignColumns: [table.id],
    }).onDelete("restrict"),
    check("content_revisions_revision_check", sql`${table.revision} >= 1`),
    check("content_revisions_schema_check", sql`${table.schemaVersion} = 1`),
    check("content_revisions_row_version_check", sql`${table.rowVersion} >= 1`),
    check(
      "content_revisions_state_check",
      sql`${table.workflowState} IN ('draft', 'validated', 'submitted', 'approved', 'published', 'archived')`,
    ),
    check(
      "content_revisions_level_check",
      sql`${table.level} IN ('hsk0', 'hsk1', 'hsk2', 'hsk3', 'hsk4')`,
    ),
    check(
      "content_revisions_title_check",
      sql`length(${table.title}) BETWEEN 1 AND 240`,
    ),
    check(
      "content_revisions_content_check",
      sql`json_valid(${table.contentJson})
        AND length(CAST(${table.contentJson} AS BLOB)) BETWEEN 2 AND 1048576`,
    ),
    check(
      "content_revisions_content_digest_check",
      sql`length(${table.contentSha256}) = 71
        AND substr(${table.contentSha256}, 1, 7) = 'sha256:'
        AND substr(${table.contentSha256}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "content_revisions_validation_check",
      sql`(
          ${table.validationJson} IS NULL
          AND ${table.validationSha256} IS NULL
        ) OR (
          json_valid(${table.validationJson})
          AND length(CAST(${table.validationJson} AS BLOB)) BETWEEN 2 AND 131072
          AND length(${table.validationSha256}) = 71
          AND substr(${table.validationSha256}, 1, 7) = 'sha256:'
          AND substr(${table.validationSha256}, 8) NOT GLOB '*[^0-9a-f]*'
        )`,
    ),
    check(
      "content_revisions_validated_state_check",
      sql`${table.workflowState} = 'draft' OR (
        ${table.validationJson} IS NOT NULL
        AND json_extract(${table.validationJson}, '$.valid') = 1
      )`,
    ),
    check(
      "content_revisions_publication_time_check",
      sql`(
          ${table.workflowState} IN ('published', 'archived')
          AND ${table.publishedAt} IS NOT NULL
        ) OR (
          ${table.workflowState} NOT IN ('published', 'archived')
          AND ${table.publishedAt} IS NULL
        )`,
    ),
    check(
      "content_revisions_archive_time_check",
      sql`(${table.workflowState} = 'archived' AND ${table.archivedAt} IS NOT NULL)
        OR (${table.workflowState} <> 'archived' AND ${table.archivedAt} IS NULL)`,
    ),
  ],
);

export const contentWorkflowEvents = sqliteTable(
  "content_workflow_events",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "restrict" }),
    revisionId: text("revision_id")
      .notNull()
      .references(() => contentRevisions.id, { onDelete: "restrict" }),
    sequence: integer("sequence").notNull(),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    actorSessionId: text("actor_session_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestSha256: text("request_sha256").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    occurredAt: integer("occurred_at").notNull(),
  },
  (table) => [
    uniqueIndex("content_workflow_revision_sequence_uidx").on(
      table.revisionId,
      table.sequence,
    ),
    uniqueIndex("content_workflow_actor_idempotency_uidx").on(
      table.actorUserId,
      table.idempotencyKey,
    ),
    index("content_workflow_item_time_idx").on(table.itemId, table.occurredAt),
    check(
      "content_workflow_state_check",
      sql`(${table.fromState} IS NULL OR ${table.fromState} IN (
          'draft', 'validated', 'submitted', 'approved', 'published', 'archived'
        )) AND ${table.toState} IN (
          'draft', 'validated', 'submitted', 'approved', 'published', 'archived'
        )`,
    ),
    check("content_workflow_sequence_check", sql`${table.sequence} >= 1`),
    check(
      "content_workflow_idempotency_check",
      sql`length(${table.idempotencyKey}) BETWEEN 8 AND 160`,
    ),
    check(
      "content_workflow_request_digest_check",
      sql`length(${table.requestSha256}) = 71
        AND substr(${table.requestSha256}, 1, 7) = 'sha256:'
        AND substr(${table.requestSha256}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "content_workflow_metadata_check",
      sql`json_valid(${table.metadataJson})
        AND length(CAST(${table.metadataJson} AS BLOB)) <= 131072`,
    ),
  ],
);

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseVersionId: text("course_version_id")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    goal: text("goal").notNull(),
    status: text("status").notNull().default("active"),
    supersedesEnrollmentId: text("supersedes_enrollment_id"),
    revision: integer("revision").notNull().default(1),
    startedAt: integer("started_at").notNull(),
    lastActivityAt: integer("last_activity_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [
    uniqueIndex("enrollments_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("enrollments_user_course_version_uidx").on(
      table.userId,
      table.courseVersionId,
    ),
    index("enrollments_user_status_idx").on(table.userId, table.status),
    foreignKey({
      name: "enrollments_user_supersedes_fk",
      columns: [table.userId, table.supersedesEnrollmentId],
      foreignColumns: [table.userId, table.id],
    }).onDelete("no action"),
    check(
      "enrollments_goal_check",
      sql`${table.goal} IN ('conversation', 'hsk', 'career', 'travel')`,
    ),
    check(
      "enrollments_status_check",
      sql`${table.status} IN ('active', 'paused', 'completed', 'archived')`,
    ),
    check("enrollments_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const idempotencyRecords = sqliteTable(
  "idempotency_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("device_id"),
    deviceSequence: integer("device_sequence"),
    resetEpoch: integer("reset_epoch"),
    scope: text("scope").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("processing"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: integer("lease_expires_at"),
    responseStatus: integer("response_status"),
    responseJson: text("response_json"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [
    uniqueIndex("idempotency_records_user_id_uidx").on(
      table.userId,
      table.id,
    ),
    uniqueIndex("idempotency_records_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("idempotency_records_user_scope_key_uidx").on(
      table.userId,
      table.scope,
      table.idempotencyKey,
    ),
    uniqueIndex("idempotency_records_user_device_sequence_uidx").on(
      table.userId,
      table.deviceId,
      table.deviceSequence,
    ),
    index("idempotency_records_device_idx").on(table.deviceId),
    index("idempotency_records_status_updated_idx").on(
      table.status,
      table.updatedAt,
    ),
    foreignKey({
      name: "idempotency_records_user_device_fk",
      columns: [table.userId, table.deviceId],
      foreignColumns: [devices.userId, devices.id],
    }).onDelete("no action"),
    check(
      "idempotency_records_status_check",
      sql`${table.status} IN ('processing', 'completed', 'failed')`,
    ),
    check(
      "idempotency_records_response_status_check",
      sql`${table.responseStatus} IS NULL OR (${table.responseStatus} >= 100 AND ${table.responseStatus} <= 599)`,
    ),
    check(
      "idempotency_records_lease_pair_check",
      sql`(${table.leaseToken} IS NULL AND ${table.leaseExpiresAt} IS NULL) OR (${table.leaseToken} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL)`,
    ),
    check(
      "idempotency_records_device_sequence_check",
      sql`(${table.deviceId} IS NULL AND ${table.deviceSequence} IS NULL) OR (${table.deviceId} IS NOT NULL AND ${table.deviceSequence} IS NOT NULL AND ${table.deviceSequence} >= 1)`,
    ),
    check(
      "idempotency_records_reset_epoch_check",
      sql`${table.resetEpoch} IS NULL OR ${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

export const learningDocuments = sqliteTable(
  "learning_documents",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull().default(0),
    documentJson: text("document_json").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check("learning_documents_revision_check", sql`${table.revision} >= 0`),
    check(
      "learning_documents_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
  ],
);

export const lessonSessions = sqliteTable(
  "lesson_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id").notNull(),
    deviceId: text("device_id"),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    lessonId: text("lesson_id").notNull(),
    lessonVersion: text("lesson_version").notNull(),
    expectedEvidenceCount: integer("expected_evidence_count").notNull(),
    formSchemaVersion: integer("form_schema_version"),
    formScript: text("form_script"),
    formManifestJson: text("form_manifest_json"),
    formManifestHash: text("form_manifest_hash"),
    status: text("status").notNull().default("started"),
    rawScore: integer("raw_score"),
    gateScore: integer("gate_score"),
    requiredEvidenceCount: integer("required_evidence_count"),
    requiredCorrectCount: integer("required_correct_count"),
    passed: integer("passed", { mode: "boolean" }),
    startedAt: integer("started_at").notNull(),
    submittedAt: integer("submitted_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("lesson_sessions_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("lesson_sessions_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("lesson_sessions_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    index("lesson_sessions_user_lesson_idx").on(
      table.userId,
      table.lessonId,
      table.startedAt,
    ),
    foreignKey({
      name: "lesson_sessions_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "lesson_sessions_user_device_fk",
      columns: [table.userId, table.deviceId],
      foreignColumns: [devices.userId, devices.id],
    }).onDelete("no action"),
    foreignKey({
      name: "lesson_sessions_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check(
      "lesson_sessions_status_check",
      sql`${table.status} IN ('started', 'submitted', 'abandoned', 'invalidated')`,
    ),
    check(
      "lesson_sessions_expected_evidence_count_check",
      sql`${table.expectedEvidenceCount} > 0`,
    ),
    check(
      "lesson_sessions_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "lesson_sessions_form_all_or_none_check",
      sql`(${table.formSchemaVersion} IS NULL AND ${table.formScript} IS NULL AND ${table.formManifestJson} IS NULL AND ${table.formManifestHash} IS NULL) OR (${table.formSchemaVersion} IS NOT NULL AND ${table.formScript} IS NOT NULL AND ${table.formManifestJson} IS NOT NULL AND ${table.formManifestHash} IS NOT NULL)`,
    ),
    check(
      "lesson_sessions_form_schema_version_check",
      sql`${table.formSchemaVersion} IS NULL OR ${table.formSchemaVersion} >= 1`,
    ),
    check(
      "lesson_sessions_form_script_check",
      sql`${table.formScript} IS NULL OR ${table.formScript} IN ('simplified', 'traditional')`,
    ),
    check(
      "lesson_sessions_form_manifest_json_check",
      sql`${table.formManifestJson} IS NULL OR json_valid(${table.formManifestJson})`,
    ),
    check(
      "lesson_sessions_form_manifest_hash_check",
      sql`${table.formManifestHash} IS NULL OR (length(${table.formManifestHash}) = 71 AND substr(${table.formManifestHash}, 1, 7) = 'sha256:' AND substr(${table.formManifestHash}, 8) NOT GLOB '*[^0-9a-f]*')`,
    ),
    check(
      "lesson_sessions_score_check",
      sql`(${table.rawScore} IS NULL OR (${table.rawScore} >= 0 AND ${table.rawScore} <= 100)) AND (${table.gateScore} IS NULL OR (${table.gateScore} >= 0 AND ${table.gateScore} <= 100))`,
    ),
    check(
      "lesson_sessions_state_coherence_check",
      sql`${table.startedAt} >= ${table.createdAt} AND (
        (${table.status} = 'started'
          AND ${table.rawScore} IS NULL
          AND ${table.gateScore} IS NULL
          AND ${table.requiredEvidenceCount} IS NULL
          AND ${table.requiredCorrectCount} IS NULL
          AND ${table.passed} IS NULL
          AND ${table.submittedAt} IS NULL)
        OR (${table.status} = 'submitted'
          AND ${table.formSchemaVersion} IS NOT NULL
          AND ${table.formScript} IS NOT NULL
          AND ${table.formManifestJson} IS NOT NULL
          AND ${table.formManifestHash} IS NOT NULL
          AND ${table.rawScore} IS NOT NULL
          AND ${table.gateScore} IS NOT NULL
          AND ${table.requiredEvidenceCount} IS NOT NULL
          AND ${table.requiredCorrectCount} IS NOT NULL
          AND ${table.passed} IN (0, 1)
          AND ${table.submittedAt} IS NOT NULL
          AND ${table.submittedAt} >= ${table.startedAt}
          AND ${table.requiredCorrectCount} BETWEEN 0 AND ${table.requiredEvidenceCount}
          AND ${table.requiredEvidenceCount} BETWEEN 0 AND ${table.expectedEvidenceCount})
        OR (${table.status} IN ('abandoned', 'invalidated')
          AND ${table.rawScore} IS NULL
          AND ${table.gateScore} IS NULL
          AND ${table.requiredEvidenceCount} IS NULL
          AND ${table.requiredCorrectCount} IS NULL
          AND ${table.passed} IS NULL
          AND ${table.submittedAt} IS NULL)
      )`,
    ),
  ],
);

export const readerSessions = sqliteTable(
  "reader_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id").notNull(),
    deviceId: text("device_id").notNull(),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    storyId: text("story_id").notNull(),
    storyVersion: text("story_version").notNull(),
    formVersion: text("form_version").notNull(),
    formSchemaVersion: integer("form_schema_version").notNull(),
    formManifestJson: text("form_manifest_json").notNull(),
    formManifestHash: text("form_manifest_hash").notNull(),
    script: text("script").notNull(),
    supportMode: text("support_mode").notNull(),
    supportPolicyVersion: text("support_policy_version").notNull(),
    expectedItemCount: integer("expected_item_count").notNull(),
    status: text("status").notNull().default("started"),
    correctCount: integer("correct_count"),
    startedAt: integer("started_at").notNull(),
    terminalAt: integer("terminal_at"),
    terminalReason: text("terminal_reason"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("reader_sessions_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("reader_sessions_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("reader_sessions_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    uniqueIndex("reader_sessions_one_started_story_epoch_uidx")
      .on(
        table.userId,
        table.resetEpoch,
        table.contentVersion,
        table.storyId,
      )
      .where(sql`${table.status} = 'started'`),
    index("reader_sessions_user_terminal_idx").on(
      table.userId,
      table.terminalAt,
    ),
    foreignKey({
      name: "reader_sessions_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "reader_sessions_user_device_fk",
      columns: [table.userId, table.deviceId],
      foreignColumns: [devices.userId, devices.id],
    }).onDelete("no action"),
    foreignKey({
      name: "reader_sessions_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check(
      "reader_sessions_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "reader_sessions_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "reader_sessions_form_schema_version_check",
      sql`${table.formSchemaVersion} >= 1`,
    ),
    check(
      "reader_sessions_expected_item_count_check",
      sql`${table.expectedItemCount} > 0`,
    ),
    check(
      "reader_sessions_form_manifest_json_check",
      sql`json_valid(${table.formManifestJson})`,
    ),
    check(
      "reader_sessions_form_manifest_hash_check",
      sql`length(${table.formManifestHash}) = 71 AND substr(${table.formManifestHash}, 1, 7) = 'sha256:' AND substr(${table.formManifestHash}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "reader_sessions_script_check",
      sql`${table.script} IN ('simplified', 'traditional')`,
    ),
    check(
      "reader_sessions_support_mode_check",
      sql`${table.supportMode} IN ('assisted', 'unassisted')`,
    ),
    check(
      "reader_sessions_status_check",
      sql`${table.status} IN ('started', 'submitted', 'abandoned')`,
    ),
    check(
      "reader_sessions_result_bounds_check",
      sql`${table.correctCount} IS NULL OR ${table.correctCount} BETWEEN 0 AND ${table.expectedItemCount}`,
    ),
    check(
      "reader_sessions_terminal_reason_check",
      sql`${table.terminalReason} IS NULL OR ${table.terminalReason} IN ('completed', 'user-exit', 'support-requested', 'superseded', 'reset-invalidated')`,
    ),
    check(
      "reader_sessions_state_coherence_check",
      sql`${table.startedAt} >= ${table.createdAt} AND (
        (${table.status} = 'started'
          AND ${table.correctCount} IS NULL
          AND ${table.terminalAt} IS NULL
          AND ${table.terminalReason} IS NULL)
        OR (${table.status} = 'submitted'
          AND ${table.correctCount} IS NOT NULL
          AND ${table.terminalAt} IS NOT NULL
          AND ${table.terminalAt} >= ${table.startedAt}
          AND ${table.terminalReason} = 'completed')
        OR (${table.status} = 'abandoned'
          AND ${table.correctCount} IS NULL
          AND ${table.terminalAt} IS NOT NULL
          AND ${table.terminalAt} >= ${table.startedAt}
          AND ${table.terminalReason} IN ('user-exit', 'support-requested', 'superseded', 'reset-invalidated'))
      )`,
    ),
  ],
);

export const readerItemExposures = sqliteTable(
  "reader_item_exposures",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    resetEpoch: integer("reset_epoch").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    storyId: text("story_id").notNull(),
    itemId: text("item_id").notNull(),
    itemVersion: text("item_version").notNull(),
    exposureGroupId: text("exposure_group_id").notNull(),
    equivalentGroupId: text("equivalent_group_id").notNull(),
    exposedAt: integer("exposed_at").notNull(),
  },
  (table) => [
    uniqueIndex("reader_item_exposures_user_group_uidx").on(
      table.userId,
      table.exposureGroupId,
    ),
    uniqueIndex("reader_item_exposures_user_equivalent_uidx").on(
      table.userId,
      table.equivalentGroupId,
    ),
    uniqueIndex("reader_item_exposures_session_item_uidx").on(
      table.userId,
      table.sessionId,
      table.itemVersion,
    ),
    index("reader_item_exposures_user_story_idx").on(
      table.userId,
      table.storyId,
      table.exposedAt,
    ),
    foreignKey({
      name: "reader_item_exposures_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        readerSessions.userId,
        readerSessions.id,
        readerSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    check(
      "reader_item_exposures_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

export const assessmentSessions = sqliteTable(
  "assessment_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id").notNull(),
    deviceId: text("device_id").notNull(),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    blueprintId: text("blueprint_id").notNull(),
    formVersion: text("form_version").notNull(),
    scoringPolicyVersion: text("scoring_policy_version").notNull(),
    expectedItemCount: integer("expected_item_count").notNull(),
    formSchemaVersion: integer("form_schema_version").notNull(),
    formManifestJson: text("form_manifest_json").notNull(),
    formManifestHash: text("form_manifest_hash").notNull(),
    status: text("status").notNull().default("started"),
    measurementEvidenceCount: integer("measurement_evidence_count"),
    measurementCorrectCount: integer("measurement_correct_count"),
    observedAccuracy: integer("observed_accuracy"),
    confidenceLower: integer("confidence_lower"),
    confidenceUpper: integer("confidence_upper"),
    startedAt: integer("started_at").notNull(),
    terminalAt: integer("terminal_at"),
    terminalReason: text("terminal_reason"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("assessment_sessions_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("assessment_sessions_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("assessment_sessions_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    uniqueIndex("assessment_sessions_one_started_epoch_uidx")
      .on(table.userId, table.resetEpoch, table.contentVersion)
      .where(sql`${table.status} = 'started'`),
    index("assessment_sessions_user_terminal_idx").on(
      table.userId,
      table.terminalAt,
    ),
    foreignKey({
      name: "assessment_sessions_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "assessment_sessions_user_device_fk",
      columns: [table.userId, table.deviceId],
      foreignColumns: [devices.userId, devices.id],
    }).onDelete("no action"),
    foreignKey({
      name: "assessment_sessions_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check(
      "assessment_sessions_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "assessment_sessions_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "assessment_sessions_expected_item_count_check",
      sql`${table.expectedItemCount} > 0`,
    ),
    check(
      "assessment_sessions_form_schema_version_check",
      sql`${table.formSchemaVersion} >= 1`,
    ),
    check(
      "assessment_sessions_form_manifest_json_check",
      sql`json_valid(${table.formManifestJson})`,
    ),
    check(
      "assessment_sessions_form_manifest_hash_check",
      sql`length(${table.formManifestHash}) = 71 AND substr(${table.formManifestHash}, 1, 7) = 'sha256:' AND substr(${table.formManifestHash}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "assessment_sessions_status_check",
      sql`${table.status} IN ('started', 'submitted', 'abandoned')`,
    ),
    check(
      "assessment_sessions_result_bounds_check",
      sql`(${table.measurementEvidenceCount} IS NULL OR ${table.measurementEvidenceCount} BETWEEN 0 AND ${table.expectedItemCount})
        AND (${table.measurementCorrectCount} IS NULL OR ${table.measurementCorrectCount} BETWEEN 0 AND ${table.measurementEvidenceCount})
        AND (${table.observedAccuracy} IS NULL OR ${table.observedAccuracy} BETWEEN 0 AND 100)
        AND (${table.confidenceLower} IS NULL OR ${table.confidenceLower} BETWEEN 0 AND 100)
        AND (${table.confidenceUpper} IS NULL OR ${table.confidenceUpper} BETWEEN 0 AND 100)
        AND (${table.confidenceLower} IS NULL OR ${table.confidenceUpper} IS NULL OR ${table.confidenceLower} <= ${table.confidenceUpper})`,
    ),
    check(
      "assessment_sessions_state_coherence_check",
      sql`${table.startedAt} >= ${table.createdAt} AND (
        (${table.status} = 'started'
          AND ${table.measurementEvidenceCount} IS NULL
          AND ${table.measurementCorrectCount} IS NULL
          AND ${table.observedAccuracy} IS NULL
          AND ${table.confidenceLower} IS NULL
          AND ${table.confidenceUpper} IS NULL
          AND ${table.terminalAt} IS NULL)
        OR (${table.status} = 'submitted'
          AND ${table.measurementEvidenceCount} IS NOT NULL
          AND ${table.measurementCorrectCount} IS NOT NULL
          AND ${table.terminalAt} IS NOT NULL
          AND ${table.terminalAt} >= ${table.startedAt}
          AND (
            (${table.measurementEvidenceCount} = 0
              AND ${table.measurementCorrectCount} = 0
              AND ${table.observedAccuracy} IS NULL
              AND ${table.confidenceLower} IS NULL
              AND ${table.confidenceUpper} IS NULL)
            OR (${table.measurementEvidenceCount} > 0
              AND ${table.observedAccuracy} IS NOT NULL
              AND ${table.confidenceLower} IS NOT NULL
              AND ${table.confidenceUpper} IS NOT NULL)
          ))
        OR (${table.status} = 'abandoned'
          AND ${table.measurementEvidenceCount} IS NULL
          AND ${table.measurementCorrectCount} IS NULL
          AND ${table.observedAccuracy} IS NULL
          AND ${table.confidenceLower} IS NULL
          AND ${table.confidenceUpper} IS NULL
          AND ${table.terminalAt} IS NOT NULL
          AND ${table.terminalAt} >= ${table.startedAt})
      )`,
    ),
  ],
);

export const assessmentItemExposures = sqliteTable(
  "assessment_item_exposures",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    resetEpoch: integer("reset_epoch").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    itemId: text("item_id").notNull(),
    itemVersion: text("item_version").notNull(),
    exposureGroupId: text("exposure_group_id").notNull(),
    equivalentGroupId: text("equivalent_group_id").notNull(),
    formFamilyId: text("form_family_id").notNull(),
    exposedAt: integer("exposed_at").notNull(),
  },
  (table) => [
    uniqueIndex("assessment_item_exposures_user_group_uidx").on(
      table.userId,
      table.exposureGroupId,
    ),
    uniqueIndex("assessment_item_exposures_session_item_uidx").on(
      table.userId,
      table.sessionId,
      table.itemVersion,
    ),
    index("assessment_item_exposures_user_family_idx").on(
      table.userId,
      table.formFamilyId,
      table.exposedAt,
    ),
    foreignKey({
      name: "assessment_item_exposures_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        assessmentSessions.userId,
        assessmentSessions.id,
        assessmentSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    check(
      "assessment_item_exposures_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

export const assessmentAttempts = sqliteTable(
  "assessment_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    deviceId: text("device_id").notNull(),
    deviceSequence: integer("device_sequence").notNull(),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    itemId: text("item_id").notNull(),
    itemVersion: text("item_version").notNull(),
    skill: text("skill").notNull(),
    construct: text("construct").notNull(),
    modality: text("modality").notNull(),
    measurementEligible: integer("measurement_eligible", { mode: "boolean" })
      .notNull(),
    responseJson: text("response_json").notNull(),
    outcome: text("outcome").notNull(),
    score: integer("score").notNull(),
    durationMs: integer("duration_ms"),
    occurredAt: integer("occurred_at").notNull(),
    receivedAt: integer("received_at").notNull(),
  },
  (table) => [
    uniqueIndex("assessment_attempts_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("assessment_attempts_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("assessment_attempts_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    uniqueIndex("assessment_attempts_user_device_sequence_uidx").on(
      table.userId,
      table.deviceId,
      table.deviceSequence,
    ),
    uniqueIndex("assessment_attempts_user_session_item_uidx").on(
      table.userId,
      table.sessionId,
      table.itemVersion,
    ),
    uniqueIndex("assessment_attempts_user_session_position_uidx").on(
      table.userId,
      table.sessionId,
      table.position,
    ),
    index("assessment_attempts_session_occurred_idx").on(
      table.sessionId,
      table.occurredAt,
    ),
    foreignKey({
      name: "assessment_attempts_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        assessmentSessions.userId,
        assessmentSessions.id,
        assessmentSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "assessment_attempts_user_device_fk",
      columns: [table.userId, table.deviceId],
      foreignColumns: [devices.userId, devices.id],
    }).onDelete("no action"),
    foreignKey({
      name: "assessment_attempts_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check(
      "assessment_attempts_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "assessment_attempts_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "assessment_attempts_device_sequence_check",
      sql`${table.deviceSequence} >= 1`,
    ),
    check("assessment_attempts_position_check", sql`${table.position} >= 0`),
    check(
      "assessment_attempts_skill_check",
      sql`${table.skill} IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')`,
    ),
    check(
      "assessment_attempts_modality_check",
      sql`${table.modality} IN ('visual-selection', 'synthetic-tts-selection')`,
    ),
    check(
      "assessment_attempts_response_json_check",
      sql`json_valid(${table.responseJson})`,
    ),
    check(
      "assessment_attempts_outcome_score_check",
      sql`(${table.outcome} = 'correct' AND ${table.score} = 100) OR (${table.outcome} = 'incorrect' AND ${table.score} = 0)`,
    ),
    check(
      "assessment_attempts_duration_check",
      sql`${table.durationMs} IS NULL OR ${table.durationMs} BETWEEN 0 AND 600000`,
    ),
    check(
      "assessment_attempts_time_check",
      sql`${table.receivedAt} >= ${table.occurredAt}`,
    ),
  ],
);

export const assessmentSkillResults = sqliteTable(
  "assessment_skill_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    resetEpoch: integer("reset_epoch").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    skill: text("skill").notNull(),
    status: text("status").notNull(),
    correctCount: integer("correct_count").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    observedAccuracy: integer("observed_accuracy"),
    confidenceLower: integer("confidence_lower"),
    confidenceUpper: integer("confidence_upper"),
    masteryEligible: integer("mastery_eligible", { mode: "boolean" })
      .notNull()
      .default(false),
    scoringPolicyVersion: text("scoring_policy_version").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("assessment_skill_results_user_session_skill_uidx").on(
      table.userId,
      table.sessionId,
      table.skill,
    ),
    index("assessment_skill_results_user_skill_idx").on(
      table.userId,
      table.skill,
      table.createdAt,
    ),
    foreignKey({
      name: "assessment_skill_results_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        assessmentSessions.userId,
        assessmentSessions.id,
        assessmentSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    check(
      "assessment_skill_results_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "assessment_skill_results_skill_check",
      sql`${table.skill} IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')`,
    ),
    check(
      "assessment_skill_results_status_check",
      sql`${table.status} IN ('unassessed', 'insufficient', 'observed')`,
    ),
    check(
      "assessment_skill_results_counts_check",
      sql`${table.correctCount} BETWEEN 0 AND ${table.evidenceCount} AND ${table.evidenceCount} >= 0`,
    ),
    check(
      "assessment_skill_results_estimate_check",
      sql`(
        ${table.evidenceCount} = 0
          AND ${table.status} = 'unassessed'
          AND ${table.observedAccuracy} IS NULL
          AND ${table.confidenceLower} IS NULL
          AND ${table.confidenceUpper} IS NULL
      ) OR (
        ${table.evidenceCount} > 0
          AND ${table.status} IN ('insufficient', 'observed')
          AND ${table.observedAccuracy} BETWEEN 0 AND 100
          AND ${table.confidenceLower} BETWEEN 0 AND 100
          AND ${table.confidenceUpper} BETWEEN 0 AND 100
          AND ${table.confidenceLower} <= ${table.confidenceUpper}
      )`,
    ),
    check(
      "assessment_skill_results_mastery_check",
      sql`${table.masteryEligible} = 0`,
    ),
  ],
);

export const learningAttempts = sqliteTable(
  "learning_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id").notNull(),
    sessionId: text("session_id"),
    deviceId: text("device_id"),
    deviceSequence: integer("device_sequence"),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    activityId: text("activity_id").notNull(),
    activityVersion: text("activity_version").notNull(),
    source: text("source").notNull(),
    method: text("method").notNull(),
    skill: text("skill").notNull(),
    responseJson: text("response_json").notNull(),
    outcome: text("outcome").notNull(),
    score: integer("score"),
    usedHint: integer("used_hint", { mode: "boolean" })
      .notNull()
      .default(false),
    priorExposure: integer("prior_exposure", { mode: "boolean" })
      .notNull()
      .default(false),
    requiredForPass: integer("required_for_pass", { mode: "boolean" })
      .notNull()
      .default(false),
    scoringVersion: text("scoring_version").notNull(),
    occurredAt: integer("occurred_at").notNull(),
    receivedAt: integer("received_at").notNull(),
  },
  (table) => [
    uniqueIndex("learning_attempts_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("learning_attempts_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("learning_attempts_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    uniqueIndex("learning_attempts_user_device_sequence_uidx").on(
      table.userId,
      table.deviceId,
      table.deviceSequence,
    ),
    uniqueIndex("learning_attempts_user_session_activity_uidx").on(
      table.userId,
      table.sessionId,
      table.activityId,
    ),
    index("learning_attempts_session_occurred_idx").on(
      table.sessionId,
      table.occurredAt,
    ),
    index("learning_attempts_user_activity_idx").on(
      table.userId,
      table.activityId,
      table.activityVersion,
    ),
    foreignKey({
      name: "learning_attempts_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "learning_attempts_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        lessonSessions.userId,
        lessonSessions.id,
        lessonSessions.resetEpoch,
      ],
    }).onDelete("no action"),
    foreignKey({
      name: "learning_attempts_user_device_fk",
      columns: [table.userId, table.deviceId],
      foreignColumns: [devices.userId, devices.id],
    }).onDelete("no action"),
    foreignKey({
      name: "learning_attempts_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check(
      "learning_attempts_device_sequence_check",
      sql`${table.deviceSequence} IS NULL OR ${table.deviceSequence} >= 1`,
    ),
    check(
      "learning_attempts_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "learning_attempts_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "learning_attempts_source_check",
      sql`${table.source} IN ('lesson', 'reader', 'writing', 'pronunciation', 'mistake', 'review', 'diagnostic')`,
    ),
    check(
      "learning_attempts_skill_check",
      sql`${table.skill} IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')`,
    ),
    check(
      "learning_attempts_outcome_check",
      sql`${table.outcome} IN ('correct', 'incorrect', 'completed', 'unverified')`,
    ),
    check(
      "learning_attempts_score_check",
      sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= 100)`,
    ),
  ],
);

export const readerSessionAttempts = sqliteTable(
  "reader_session_attempts",
  {
    userId: text("user_id").notNull(),
    sessionId: text("session_id").notNull(),
    attemptId: text("attempt_id").notNull(),
    resetEpoch: integer("reset_epoch").notNull(),
    position: integer("position").notNull(),
    itemId: text("item_id").notNull(),
    itemVersion: text("item_version").notNull(),
    formManifestHash: text("form_manifest_hash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({
      name: "reader_session_attempts_pk",
      columns: [table.userId, table.sessionId, table.attemptId],
    }),
    uniqueIndex("reader_session_attempts_user_attempt_uidx").on(
      table.userId,
      table.attemptId,
    ),
    uniqueIndex("reader_session_attempts_user_session_position_uidx").on(
      table.userId,
      table.sessionId,
      table.position,
    ),
    uniqueIndex("reader_session_attempts_user_session_item_uidx").on(
      table.userId,
      table.sessionId,
      table.itemVersion,
    ),
    foreignKey({
      name: "reader_session_attempts_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        readerSessions.userId,
        readerSessions.id,
        readerSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "reader_session_attempts_user_attempt_fk",
      columns: [table.userId, table.attemptId, table.resetEpoch],
      foreignColumns: [
        learningAttempts.userId,
        learningAttempts.id,
        learningAttempts.resetEpoch,
      ],
    }).onDelete("cascade"),
    check(
      "reader_session_attempts_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "reader_session_attempts_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "reader_session_attempts_form_manifest_hash_check",
      sql`length(${table.formManifestHash}) = 71 AND substr(${table.formManifestHash}, 1, 7) = 'sha256:' AND substr(${table.formManifestHash}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
  ],
);

export const learningEvidence = sqliteTable(
  "learning_evidence",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id").notNull(),
    attemptId: text("attempt_id"),
    sessionId: text("session_id"),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    policyVersion: text("policy_version").notNull(),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    activityId: text("activity_id").notNull(),
    activityVersion: text("activity_version").notNull(),
    source: text("source").notNull(),
    method: text("method").notNull(),
    skill: text("skill").notNull(),
    outcome: text("outcome").notNull(),
    score: integer("score"),
    verified: integer("verified", { mode: "boolean" }).notNull(),
    masteryEligible: integer("mastery_eligible", { mode: "boolean" })
      .notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    occurredAt: integer("occurred_at").notNull(),
    recordedAt: integer("recorded_at").notNull(),
  },
  (table) => [
    uniqueIndex("learning_evidence_attempt_skill_policy_uidx").on(
      table.attemptId,
      table.skill,
      table.policyVersion,
    ),
    uniqueIndex("learning_evidence_session_method_policy_uidx").on(
      table.sessionId,
      table.method,
      table.policyVersion,
    ),
    index("learning_evidence_user_skill_occurred_idx").on(
      table.userId,
      table.skill,
      table.occurredAt,
    ),
    index("learning_evidence_user_activity_idx").on(
      table.userId,
      table.activityId,
      table.activityVersion,
    ),
    foreignKey({
      name: "learning_evidence_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "learning_evidence_user_attempt_fk",
      columns: [table.userId, table.attemptId, table.resetEpoch],
      foreignColumns: [
        learningAttempts.userId,
        learningAttempts.id,
        learningAttempts.resetEpoch,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "learning_evidence_user_session_fk",
      columns: [table.userId, table.sessionId, table.resetEpoch],
      foreignColumns: [
        lessonSessions.userId,
        lessonSessions.id,
        lessonSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    check(
      "learning_evidence_one_origin_check",
      sql`((${table.attemptId} IS NOT NULL) + (${table.sessionId} IS NOT NULL)) = 1`,
    ),
    check(
      "learning_evidence_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "learning_evidence_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "learning_evidence_source_check",
      sql`${table.source} IN ('lesson', 'reader', 'writing', 'pronunciation', 'mistake', 'review', 'diagnostic')`,
    ),
    check(
      "learning_evidence_skill_check",
      sql`${table.skill} IN ('pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary', 'grammar')`,
    ),
    check(
      "learning_evidence_outcome_check",
      sql`${table.outcome} IN ('correct', 'incorrect', 'completed', 'unverified')`,
    ),
    check(
      "learning_evidence_score_check",
      sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= 100)`,
    ),
    check(
      "learning_evidence_mastery_eligibility_check",
      sql`${table.masteryEligible} = 0 OR (${table.verified} = 1 AND ${table.outcome} IN ('correct', 'incorrect'))`,
    ),
  ],
);

export const fsrsCards = sqliteTable(
  "fsrs_cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id").notNull(),
    activationSessionId: text("activation_session_id"),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    contentVersion: text("content_version")
      .notNull()
      .references(() => courseVersions.id, { onDelete: "restrict" }),
    knowledgeItemType: text("knowledge_item_type").notNull(),
    knowledgeItemId: text("knowledge_item_id").notNull(),
    knowledgeItemVersion: text("knowledge_item_version").notNull(),
    modality: text("modality").notNull(),
    schedulerVersion: text("scheduler_version").notNull(),
    dueAt: integer("due_at").notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    state: integer("state").notNull(),
    lastReviewAt: integer("last_review_at"),
    revision: integer("revision").notNull().default(1),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("fsrs_cards_user_id_uidx").on(table.userId, table.id),
    uniqueIndex("fsrs_cards_user_id_epoch_uidx").on(
      table.userId,
      table.id,
      table.resetEpoch,
    ),
    uniqueIndex("fsrs_cards_user_item_modality_uidx").on(
      table.userId,
      table.enrollmentId,
      table.resetEpoch,
      table.knowledgeItemType,
      table.knowledgeItemId,
      table.knowledgeItemVersion,
      table.modality,
      table.schedulerVersion,
    ).where(sql`${table.activationSessionId} IS NOT NULL`),
    index("fsrs_cards_user_due_idx").on(
      table.userId,
      table.resetEpoch,
      table.dueAt,
    ),
    foreignKey({
      name: "fsrs_cards_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fsrs_cards_activation_session_fk",
      columns: [table.userId, table.activationSessionId, table.resetEpoch],
      foreignColumns: [
        lessonSessions.userId,
        lessonSessions.id,
        lessonSessions.resetEpoch,
      ],
    }).onDelete("cascade"),
    check(
      "fsrs_cards_numeric_state_check",
      sql`${table.stability} >= 0 AND ${table.difficulty} >= 0 AND ${table.elapsedDays} >= 0 AND ${table.scheduledDays} >= 0 AND ${table.learningSteps} >= 0 AND ${table.reps} >= 0 AND ${table.lapses} >= 0`,
    ),
    check("fsrs_cards_state_check", sql`${table.state} BETWEEN 0 AND 3`),
    check("fsrs_cards_revision_check", sql`${table.revision} >= 1`),
    check(
      "fsrs_cards_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

export const reviewLogs = sqliteTable(
  "review_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),
    attemptId: text("attempt_id"),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    rating: integer("rating").notNull(),
    schedulerVersion: text("scheduler_version").notNull(),
    scheduledAt: integer("scheduled_at").notNull(),
    reviewedAt: integer("reviewed_at").notNull(),
    receivedAt: integer("received_at").notNull(),
    durationMs: integer("duration_ms"),
    preCardJson: text("pre_card_json").notNull(),
    postCardJson: text("post_card_json").notNull(),
  },
  (table) => [
    uniqueIndex("review_logs_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    index("review_logs_card_reviewed_idx").on(table.cardId, table.reviewedAt),
    foreignKey({
      name: "review_logs_user_card_fk",
      columns: [table.userId, table.cardId, table.resetEpoch],
      foreignColumns: [fsrsCards.userId, fsrsCards.id, fsrsCards.resetEpoch],
    }).onDelete("cascade"),
    foreignKey({
      name: "review_logs_user_attempt_fk",
      columns: [table.userId, table.attemptId, table.resetEpoch],
      foreignColumns: [
        learningAttempts.userId,
        learningAttempts.id,
        learningAttempts.resetEpoch,
      ],
    }).onDelete("no action"),
    foreignKey({
      name: "review_logs_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check("review_logs_rating_check", sql`${table.rating} BETWEEN 1 AND 4`),
    check(
      "review_logs_duration_check",
      sql`${table.durationMs} IS NULL OR ${table.durationMs} >= 0`,
    ),
    check(
      "review_logs_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

export const xpLedger = sqliteTable(
  "xp_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: text("enrollment_id"),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    ruleVersion: text("rule_version").notNull(),
    amount: integer("amount").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    occurredAt: integer("occurred_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("xp_ledger_user_source_rule_uidx").on(
      table.userId,
      table.sourceType,
      table.sourceId,
      table.ruleVersion,
    ),
    index("xp_ledger_user_occurred_idx").on(table.userId, table.occurredAt),
    foreignKey({
      name: "xp_ledger_user_enrollment_fk",
      columns: [table.userId, table.enrollmentId],
      foreignColumns: [enrollments.userId, enrollments.id],
    }).onDelete("no action"),
    foreignKey({
      name: "xp_ledger_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId, table.resetEpoch],
      foreignColumns: [
        idempotencyRecords.userId,
        idempotencyRecords.id,
        idempotencyRecords.resetEpoch,
      ],
    }).onDelete("restrict"),
    check(
      "xp_ledger_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

export const syncChanges = sqliteTable(
  "sync_changes",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    revision: integer("revision").notNull(),
    resetEpoch: integer("reset_epoch"),
    operationId: text("operation_id").notNull(),
    operation: text("operation").notNull(),
    payloadJson: text("payload_json"),
    occurredAt: integer("occurred_at").notNull(),
  },
  (table) => [
    index("sync_changes_user_seq_idx").on(table.userId, table.seq),
    index("sync_changes_user_reset_epoch_seq_idx").on(
      table.userId,
      table.resetEpoch,
      table.seq,
    ),
    uniqueIndex("sync_changes_user_operation_uidx").on(
      table.userId,
      table.operationId,
    ),
    check("sync_changes_revision_check", sql`${table.revision} >= 0`),
    check(
      "sync_changes_reset_epoch_check",
      sql`${table.resetEpoch} IS NULL OR ${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
    check(
      "sync_changes_operation_check",
      sql`${table.operation} IN ('upsert', 'delete')`,
    ),
  ],
);

export const localImportReceipts = sqliteTable(
  "local_import_receipts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyRecordId: text("idempotency_record_id").notNull(),
    installationId: text("installation_id").notNull(),
    sourceSchemaVersion: integer("source_schema_version").notNull(),
    sourceContentVersion: text("source_content_version"),
    snapshotHash: text("snapshot_hash").notNull(),
    status: text("status").notNull().default("processing"),
    importedCountsJson: text("imported_counts_json").notNull().default("{}"),
    warningsJson: text("warnings_json").notNull().default("[]"),
    createdAt: integer("created_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [
    uniqueIndex("local_import_receipts_user_snapshot_uidx").on(
      table.userId,
      table.snapshotHash,
    ),
    uniqueIndex("local_import_receipts_idempotency_record_uidx").on(
      table.idempotencyRecordId,
    ),
    foreignKey({
      name: "local_import_receipts_user_idempotency_fk",
      columns: [table.userId, table.idempotencyRecordId],
      foreignColumns: [idempotencyRecords.userId, idempotencyRecords.id],
    }).onDelete("restrict"),
    check(
      "local_import_receipts_schema_version_check",
      sql`${table.sourceSchemaVersion} >= 1`,
    ),
    check(
      "local_import_receipts_status_check",
      sql`${table.status} IN ('processing', 'completed', 'completed_with_warnings', 'failed')`,
    ),
  ],
);

export const outboxEvents = sqliteTable(
  "outbox_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    resetEpoch: integer("reset_epoch").notNull().default(0),
    payloadJson: text("payload_json").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: integer("available_at").notNull(),
    createdAt: integer("created_at").notNull(),
    publishedAt: integer("published_at"),
    lastError: text("last_error"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: integer("lease_expires_at"),
  },
  (table) => [
    index("outbox_events_status_available_idx").on(
      table.status,
      table.availableAt,
    ),
    index("outbox_events_user_created_idx").on(table.userId, table.createdAt),
    index("outbox_events_status_lease_expiry_idx").on(
      table.status,
      table.leaseExpiresAt,
    ),
    check(
      "outbox_events_status_check",
      sql`${table.status} IN ('pending', 'processing', 'published', 'dead')`,
    ),
    check("outbox_events_attempts_check", sql`${table.attempts} >= 0`),
    check(
      "outbox_events_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "outbox_events_reset_epoch_check",
      sql`${table.resetEpoch} BETWEEN 0 AND 2147483647`,
    ),
  ],
);

/**
 * Operational editorial assignments live outside the learner/user realm.
 *
 * Every exact content package has one globally serialized, append-only event
 * stream. The application replays this bounded log to derive active
 * role/target ownership; no mutable projection is authoritative.
 */
export const editorialAssignmentEvents = sqliteTable(
  "editorial_assignment_events",
  {
    eventId: text("event_id").primaryKey(),
    streamId: text("stream_id").notNull(),
    sequence: integer("sequence").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    eventType: text("event_type").notNull(),
    contentVersion: text("content_version").notNull(),
    packageManifestSha256: text("package_manifest_sha256").notNull(),
    itemCatalogSha256: text("item_catalog_sha256").notNull(),
    assignmentId: text("assignment_id"),
    assignmentSha256: text("assignment_sha256"),
    previousAssignmentId: text("previous_assignment_id"),
    previousAssignmentSha256: text("previous_assignment_sha256"),
    role: text("role"),
    assigneeOperatorId: text("assignee_operator_id"),
    envelopeJson: text("envelope_json"),
    targetCount: integer("target_count").notNull(),
    actorOperatorId: text("actor_operator_id").notNull(),
    actorCredentialId: text("actor_credential_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestSha256: text("request_sha256").notNull(),
    previousEventId: text("previous_event_id"),
    previousEventSha256: text("previous_event_sha256"),
    eventJson: text("event_json").notNull(),
    eventSha256: text("event_sha256").notNull(),
    occurredAt: integer("occurred_at").notNull(),
  },
  (table) => [
    uniqueIndex("editorial_assignment_events_stream_sequence_uidx").on(
      table.streamId,
      table.sequence,
    ),
    uniqueIndex("editorial_assignment_events_stream_event_uidx").on(
      table.streamId,
      table.eventId,
    ),
    uniqueIndex("editorial_assignment_events_actor_idempotency_uidx").on(
      table.actorOperatorId,
      table.idempotencyKey,
    ),
    uniqueIndex("editorial_assignment_events_sha256_uidx").on(
      table.eventSha256,
    ),
    uniqueIndex("editorial_assignment_events_predecessor_uidx")
      .on(table.streamId, table.previousEventId)
      .where(sql`${table.previousEventId} IS NOT NULL`),
    uniqueIndex("editorial_assignment_events_genesis_uidx")
      .on(table.streamId)
      .where(sql`${table.previousEventId} IS NULL`),
    uniqueIndex("editorial_assignment_events_assignment_uidx")
      .on(table.assignmentId)
      .where(sql`${table.assignmentId} IS NOT NULL`),
    index("editorial_assignment_events_stream_sequence_idx").on(
      table.streamId,
      table.sequence,
    ),
    foreignKey({
      name: "editorial_assignment_events_predecessor_fk",
      columns: [table.streamId, table.previousEventId],
      foreignColumns: [table.streamId, table.eventId],
    }).onDelete("restrict"),
    check(
      "editorial_assignment_events_sequence_check",
      sql`${table.sequence} BETWEEN 1 AND 10000`,
    ),
    check(
      "editorial_assignment_events_schema_version_check",
      sql`${table.schemaVersion} = 1`,
    ),
    check(
      "editorial_assignment_events_type_check",
      sql`${table.eventType} IN ('assigned', 'reassigned', 'cancelled')`,
    ),
    check(
      "editorial_assignment_events_identifier_check",
      sql`length(${table.eventId}) BETWEEN 1 AND 128
        AND length(${table.contentVersion}) BETWEEN 1 AND 128
        AND length(${table.actorOperatorId}) BETWEEN 1 AND 128
        AND length(${table.actorCredentialId}) BETWEEN 1 AND 128
        AND length(${table.idempotencyKey}) BETWEEN 1 AND 128`,
    ),
    check(
      "editorial_assignment_events_stream_digest_check",
      sql`length(${table.streamId}) = 71
        AND substr(${table.streamId}, 1, 7) = 'sha256:'
        AND substr(${table.streamId}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "editorial_assignment_events_manifest_digest_check",
      sql`length(${table.packageManifestSha256}) = 71
        AND substr(${table.packageManifestSha256}, 1, 7) = 'sha256:'
        AND substr(${table.packageManifestSha256}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "editorial_assignment_events_catalog_digest_check",
      sql`length(${table.itemCatalogSha256}) = 71
        AND substr(${table.itemCatalogSha256}, 1, 7) = 'sha256:'
        AND substr(${table.itemCatalogSha256}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "editorial_assignment_events_request_digest_check",
      sql`length(${table.requestSha256}) = 71
        AND substr(${table.requestSha256}, 1, 7) = 'sha256:'
        AND substr(${table.requestSha256}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "editorial_assignment_events_event_digest_check",
      sql`length(${table.eventSha256}) = 71
        AND substr(${table.eventSha256}, 1, 7) = 'sha256:'
        AND substr(${table.eventSha256}, 8) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      "editorial_assignment_events_optional_digest_check",
      sql`(${table.assignmentSha256} IS NULL OR (
          length(${table.assignmentSha256}) = 71
          AND substr(${table.assignmentSha256}, 1, 7) = 'sha256:'
          AND substr(${table.assignmentSha256}, 8) NOT GLOB '*[^0-9a-f]*'
        ))
        AND (${table.previousAssignmentSha256} IS NULL OR (
          length(${table.previousAssignmentSha256}) = 71
          AND substr(${table.previousAssignmentSha256}, 1, 7) = 'sha256:'
          AND substr(${table.previousAssignmentSha256}, 8) NOT GLOB '*[^0-9a-f]*'
        ))
        AND (${table.previousEventSha256} IS NULL OR (
          length(${table.previousEventSha256}) = 71
          AND substr(${table.previousEventSha256}, 1, 7) = 'sha256:'
          AND substr(${table.previousEventSha256}, 8) NOT GLOB '*[^0-9a-f]*'
        ))`,
    ),
    check(
      "editorial_assignment_events_json_check",
      sql`json_valid(${table.eventJson})
        AND (${table.envelopeJson} IS NULL OR json_valid(${table.envelopeJson}))
        AND length(CAST(${table.eventJson} AS BLOB)) <= 700000
        AND COALESCE(length(CAST(${table.envelopeJson} AS BLOB)), 0) <= 600000
        AND length(CAST(${table.eventJson} AS BLOB))
          + COALESCE(length(CAST(${table.envelopeJson} AS BLOB)), 0)
          <= 1350000`,
    ),
    check(
      "editorial_assignment_events_target_count_check",
      sql`${table.targetCount} >= 0 AND ${table.targetCount} <= 10000`,
    ),
    check(
      "editorial_assignment_events_role_check",
      sql`${table.role} IS NULL OR ${table.role} IN (
        'content-owner', 'native-linguistic', 'source-license', 'audio-rights'
      )`,
    ),
    check(
      "editorial_assignment_events_shape_check",
      sql`(
          ${table.eventType} = 'assigned'
          AND ${table.assignmentId} IS NOT NULL
          AND ${table.assignmentSha256} IS NOT NULL
          AND ${table.previousAssignmentId} IS NULL
          AND ${table.previousAssignmentSha256} IS NULL
          AND ${table.role} IS NOT NULL
          AND ${table.assigneeOperatorId} IS NOT NULL
          AND ${table.envelopeJson} IS NOT NULL
          AND ${table.targetCount} > 0
        ) OR (
          ${table.eventType} = 'reassigned'
          AND ${table.assignmentId} IS NOT NULL
          AND ${table.assignmentSha256} IS NOT NULL
          AND ${table.previousAssignmentId} IS NOT NULL
          AND ${table.previousAssignmentSha256} IS NOT NULL
          AND ${table.role} IS NOT NULL
          AND ${table.assigneeOperatorId} IS NOT NULL
          AND ${table.envelopeJson} IS NOT NULL
          AND ${table.targetCount} > 0
        ) OR (
          ${table.eventType} = 'cancelled'
          AND ${table.assignmentId} IS NULL
          AND ${table.assignmentSha256} IS NULL
          AND ${table.previousAssignmentId} IS NOT NULL
          AND ${table.previousAssignmentSha256} IS NOT NULL
          AND ${table.role} IS NULL
          AND ${table.assigneeOperatorId} IS NULL
          AND ${table.envelopeJson} IS NULL
          AND ${table.targetCount} = 0
        )`,
    ),
    check(
      "editorial_assignment_events_predecessor_pair_check",
      sql`(${table.previousEventId} IS NULL
          AND ${table.previousEventSha256} IS NULL
          AND ${table.sequence} = 1
          AND ${table.eventType} = 'assigned')
        OR (${table.previousEventId} IS NOT NULL
          AND ${table.previousEventSha256} IS NOT NULL
          AND ${table.sequence} > 1)`,
    ),
    check(
      "editorial_assignment_events_time_check",
      sql`${table.occurredAt} BETWEEN 0 AND 8640000000000000`,
    ),
  ],
);
