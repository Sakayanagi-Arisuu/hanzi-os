import type { D1Database } from './d1';

/** Audit/payment/editorial references survive account requests. Never cascade them away. */
export const ACCOUNT_DELETION_RETAINED_REFS = [
  ['content_revisions', 'author_user_id'], ['content_workflow_events', 'actor_user_id'],
  ['content_release_outbox_events', 'actor_user_id'], ['content_items', 'created_by_user_id'],
  ['content_revision_assignment_events', 'actor_user_id'], ['content_revision_assignment_events', 'reviewer_user_id'],
  ['content_revision_assignment_events', 'owner_user_id'], ['lesson_media_assets', 'created_by'], ['commerce_cash_orders', 'user_id'],
] as const;
export const ACCOUNT_DELETION_CHILD_TABLES = [
  // Private avatar tables reference only users with ON DELETE CASCADE.
  // Purge them in the guarded parent DELETE, preserving the Free D1 query budget.
  'premium_support_tickets', 'hanzi_wallet_entries', 'hanzi_premium_orders', 'hanzi_wallets', 'commerce_sandbox_orders',
  'lesson_page_attempts', 'learner_access_days', 'learner_workspace_entries', 'review_logs', 'learning_evidence',
  'reader_session_attempts', 'learning_attempts', 'lesson_sessions', 'reader_item_exposures', 'reader_sessions',
  'assessment_skill_results', 'assessment_attempts', 'assessment_item_exposures', 'assessment_sessions', 'fsrs_cards',
  'xp_ledger', 'local_import_receipts', 'idempotency_records', 'outbox_events', 'sync_changes', 'learning_documents',
  'enrollments', 'mutation_rate_limits', 'devices', 'profiles', 'user_roles', 'auth_sessions', 'passkey_credentials',
  'auth_challenges', 'hosted_credential_states', 'hosted_hanzi_aliases', 'hanzi_password_credentials', 'auth_identities',
] as const;

/** Owner expression is a fixed SQL alias supplied by this module's callers. */
export function deletionGuardSql(ownerExpression: 'users.id' | 'account_deletion_jobs.user_id') {
  return [...ACCOUNT_DELETION_RETAINED_REFS.map(([table, column]) => `NOT EXISTS(SELECT 1 FROM ${table} WHERE ${column}=${ownerExpression})`),
    `NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=${ownerExpression} AND role<>'learner')`].join(' AND ');
}
export class AccountDeletionRestrictedError extends Error {}
export async function assertAccountDeletionAllowed(database: D1Database, userId: string) {
  const row = await database.prepare(`SELECT id FROM users WHERE id=? AND ${deletionGuardSql('users.id')} LIMIT 1`).bind(userId).first();
  if (!row) throw new AccountDeletionRestrictedError('Account has retained operational records.');
}
