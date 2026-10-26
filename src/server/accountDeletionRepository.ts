import { sha256Base64Url } from '../auth/authCrypto';
import { deriveAccountKey } from '../lib/accountKey';
import type { D1Database } from './d1';
import type { FirebaseAuthAdmin } from './firebaseAuthAdmin';
import { hostedFirebaseAdmin } from './hostedCredentialState';
import { ACCOUNT_DELETION_CHILD_TABLES, AccountDeletionRestrictedError, assertAccountDeletionAllowed, deletionGuardSql } from './accountDeletionPolicy';

type Job = { id: string; userId: string; projectId: string | null; uid: string | null; email: string | null;
  status: 'pending' | 'provider_deleted' | 'completed'; expiresAt: number; attempts: number; leaseExpiresAt: number | null };
type AdminFor = (projectId: string) => Promise<Pick<FirebaseAuthAdmin, 'lookup' | 'delete'>>;
const columns = 'id,user_id AS userId,project_id AS projectId,firebase_uid AS uid,expected_email AS email,status,expires_at AS expiresAt,attempts,lease_expires_at AS leaseExpiresAt';
const RECEIPT_LIFETIME = 31 * 86400_000;
const LEASE_LIFETIME = 120_000;
export const validAccountDeletionToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/u.test(value);
export class AccountDeletionConflictError extends Error {}

/** External credential deletion is idempotent; owner graph purge is one D1 transaction. */
export class AccountDeletionRepository {
  constructor(private readonly database: D1Database, private readonly adminFor: AdminFor = hostedFirebaseAdmin,
    private readonly now: () => number = Date.now) {}

  async find(token: string): Promise<Job | null> {
    if (!validAccountDeletionToken(token)) return null;
    return this.database.prepare(`SELECT ${columns} FROM account_deletion_jobs WHERE token_hash=? LIMIT 1`).bind(await sha256Base64Url(token)).first<Job>();
  }
  async start(userId: string, token: string, sessionId: string, authenticatedAt: number): Promise<Job> {
    if (!validAccountDeletionToken(token)) throw new AccountDeletionConflictError('Deletion receipt invalid.');
    const found = await this.find(token);
    if (found) {
      if (found.userId !== userId) throw new AccountDeletionConflictError('Deletion receipt owner mismatch.');
      return found;
    }
    await assertAccountDeletionAllowed(this.database, userId);
    const alias = await this.database.prepare('SELECT project_id AS projectId,firebase_uid AS uid,normalized_email AS email FROM hosted_hanzi_aliases WHERE user_id=? LIMIT 1')
      .bind(userId).first<{ projectId: string; uid: string; email: string }>();
    if (alias) await this.adminFor(alias.projectId); // Validate configuration before freezing an account.
    const timestamp = this.now(); const tokenHash = await sha256Base64Url(token);
    const jobId = crypto.randomUUID();
    const results = await this.database.batch([
      this.database.prepare(`INSERT OR IGNORE INTO account_deletion_jobs(id,user_id,token_hash,project_id,firebase_uid,expected_email,status,
        requested_at,authenticated_at,updated_at,expires_at,next_attempt_at)
        SELECT ?,id,?,?,?,?,'pending',?,?,?,?,? FROM users WHERE id=? AND status='active' AND ${deletionGuardSql('users.id')}
        AND EXISTS(SELECT 1 FROM auth_sessions WHERE id=? AND user_id=users.id AND revoked_at IS NULL AND expires_at>?
          AND authenticated_at=? AND authenticated_at>=? AND authenticated_at<=?)
        AND ((? IS NULL AND NOT EXISTS(SELECT 1 FROM hosted_hanzi_aliases WHERE user_id=users.id))
          OR EXISTS(SELECT 1 FROM hosted_hanzi_aliases WHERE user_id=users.id AND project_id=? AND firebase_uid=? AND normalized_email=?))`)
        .bind(jobId, tokenHash, alias?.projectId ?? null, alias?.uid ?? null, alias?.email ?? null, timestamp,
          Math.min(authenticatedAt, timestamp), timestamp, timestamp + RECEIPT_LIFETIME, timestamp, userId,
          sessionId, timestamp, authenticatedAt, timestamp - 600_000, timestamp + 60_000,
          alias?.projectId ?? null, alias?.projectId ?? null, alias?.uid ?? null, alias?.email ?? null),
      this.database.prepare(`UPDATE users SET status='deletion_pending',updated_at=? WHERE id=? AND status='active'
        AND EXISTS(SELECT 1 FROM account_deletion_jobs WHERE user_id=users.id AND token_hash=? AND status='pending')`).bind(timestamp, userId, tokenHash),
      this.database.prepare(`UPDATE auth_sessions SET revoked_at=MAX(created_at,?) WHERE user_id=? AND revoked_at IS NULL
        AND EXISTS(SELECT 1 FROM account_deletion_jobs WHERE user_id=? AND token_hash=? AND status='pending')`).bind(timestamp, userId, userId, tokenHash),
    ]);
    if (results.some(result => !result.success)) throw new Error('Deletion start unavailable.');
    const job = await this.find(token);
    if (!job || job.userId !== userId) throw new AccountDeletionConflictError('Deletion authority changed.');
    return job;
  }
  async result(job: Job) { return { deleted: job.status === 'completed', pending: job.status !== 'completed', ownerKey: await deriveAccountKey(job.userId) }; }
  async run(job: Job) {
    if (job.status === 'completed') return this.result(job);
    const timestamp = this.now(); const lease = crypto.randomUUID();
    const claimed = await this.database.prepare(`UPDATE account_deletion_jobs SET lease_token=?,lease_expires_at=?,attempts=attempts+1,updated_at=?
      WHERE id=? AND status<>'completed' AND attempts<1000000 AND (lease_token IS NULL OR lease_expires_at<=?) RETURNING ${columns}`)
      .bind(lease, timestamp + LEASE_LIFETIME, timestamp, job.id, timestamp).first<Job>();
    if (!claimed) {
      const current = await this.database.prepare(`SELECT ${columns} FROM account_deletion_jobs WHERE id=?`).bind(job.id).first<Job>();
      if (!current) throw new Error('Deletion job unavailable.'); return this.result(current);
    }
    let phase: 'provider_unavailable' | 'graph_unavailable' | 'graph_blocked' = 'graph_blocked';
    try {
      await assertAccountDeletionAllowed(this.database, claimed.userId);
      if (claimed.status === 'pending') {
        if (claimed.projectId && claimed.uid && claimed.email) {
          phase = 'provider_unavailable';
          const admin = await this.adminFor(claimed.projectId);
          const identity = await admin.lookup(claimed.uid);
          if (identity && (identity.uid !== claimed.uid || identity.email !== claimed.email)) throw new Error('Deletion identity changed.');
          // Missing UID means a prior delete succeeded but its response was lost.
          if (identity) await admin.delete(claimed.uid);
        }
        const recorded = await this.database.prepare(`UPDATE account_deletion_jobs SET status='provider_deleted',updated_at=?
          WHERE id=? AND status='pending' AND lease_token=?`).bind(this.now(), claimed.id, lease).run();
        if (!recorded.success || recorded.meta?.changes !== 1) throw new Error('Deletion lease changed.');
      }
      phase = 'graph_unavailable';
      await assertAccountDeletionAllowed(this.database, claimed.userId);
      const guard = `EXISTS(SELECT 1 FROM account_deletion_jobs WHERE id=? AND user_id=? AND status='provider_deleted'
        AND lease_token=? AND lease_expires_at>? AND ${deletionGuardSql('account_deletion_jobs.user_id')}
        AND EXISTS(SELECT 1 FROM users WHERE id=account_deletion_jobs.user_id AND status='deletion_pending'))`;
      const statements = ACCOUNT_DELETION_CHILD_TABLES.map(table => this.database.prepare(`DELETE FROM ${table} WHERE user_id=? AND ${guard}`)
        .bind(claimed.userId, claimed.id, claimed.userId, lease, this.now()));
      statements.push(this.database.prepare(`DELETE FROM users WHERE id=? AND status='deletion_pending' AND ${guard}`)
        .bind(claimed.userId, claimed.id, claimed.userId, lease, this.now()));
      statements.push(this.database.prepare(`UPDATE account_deletion_jobs SET status='completed',project_id=NULL,firebase_uid=NULL,expected_email=NULL,
        completed_at=?,updated_at=?,expires_at=MAX(expires_at,?),last_error=NULL,lease_token=NULL,lease_expires_at=NULL WHERE id=? AND status='provider_deleted'
        AND lease_token=? AND NOT EXISTS(SELECT 1 FROM users WHERE id=account_deletion_jobs.user_id)`)
        .bind(this.now(), this.now(), this.now() + RECEIPT_LIFETIME, claimed.id, lease));
      const purged = await this.database.batch(statements);
      if (purged.some(result => !result.success) || purged.at(-1)?.meta?.changes !== 1) throw new Error('Deletion graph remains pending.');
    } catch (error) {
      if (error instanceof AccountDeletionRestrictedError) phase = 'graph_blocked';
      const next = this.now() + Math.min(6 * 3600_000, 30_000 * 2 ** Math.min(claimed.attempts, 10));
      await this.database.prepare(`UPDATE account_deletion_jobs SET last_error=?,next_attempt_at=?,updated_at=?,lease_token=NULL,lease_expires_at=NULL
        WHERE id=? AND status<>'completed' AND lease_token=?`).bind(phase, next, this.now(), claimed.id, lease).run();
    }
    const current = await this.database.prepare(`SELECT ${columns} FROM account_deletion_jobs WHERE id=?`).bind(job.id).first<Job>();
    if (!current) throw new Error('Deletion job unavailable.'); return this.result(current);
  }
  async resume(token: string) {
    const job = await this.find(token);
    if (!job || job.expiresAt <= this.now()) throw new AccountDeletionConflictError('Deletion receipt unavailable.');
    return this.run(job);
  }
  async runDueJobs() {
    const result = await this.database.prepare(`SELECT ${columns} FROM account_deletion_jobs WHERE status<>'completed'
      AND next_attempt_at<=? AND (lease_token IS NULL OR lease_expires_at<=?) ORDER BY requested_at LIMIT 1`).bind(this.now(), this.now()).all<Job>();
    if (!result.success) throw new Error('Deletion queue unavailable.');
    for (const job of result.results ?? []) await this.run(job);
    await this.database.prepare("DELETE FROM account_deletion_jobs WHERE status='completed' AND expires_at<=?").bind(this.now()).run();
  }
}
