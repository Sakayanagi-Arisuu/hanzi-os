import { getRuntimeEnvironment, type D1Database } from './d1';
import { FirebaseAuthAdmin, FirebaseAuthAdminUnavailableError, firebaseAuthAdminConfig, type FirebaseCredentialState } from './firebaseAuthAdmin';

type Alias = { projectId: string; uid: string; email: string };
export type HostedCredentialVersion = { passwordUpdatedAt: number; validSince: number };
export class HostedCredentialRejectedError extends Error {}
const unavailable = () => new FirebaseAuthAdminUnavailableError('Account administration unavailable.');
const cachedAdmins = new Map<string, FirebaseAuthAdmin>();
export async function hostedFirebaseAdmin(projectId: string): Promise<FirebaseAuthAdmin> {
  const environment = await getRuntimeEnvironment<{ FIREBASE_PROJECT_ID?: string; FIREBASE_AUTH_SERVICE_ACCOUNT?: string }>();
  const config = firebaseAuthAdminConfig(environment.FIREBASE_PROJECT_ID, environment.FIREBASE_AUTH_SERVICE_ACCOUNT);
  if (!config || config.projectId !== projectId) throw unavailable();
  const cacheKey = `${config.projectId}:${config.clientEmail}:${config.privateKeyId}`;
  let admin = cachedAdmins.get(cacheKey);
  if (!admin) {
    // Bound the token cache when credentials rotate. Password/account state is
    // deliberately not cached: authority checks must observe a provider reset.
    if (cachedAdmins.size >= 3) cachedAdmins.clear();
    admin = new FirebaseAuthAdmin(config);
    cachedAdmins.set(cacheKey, admin);
  }
  return admin;
}

/** Checks all sessions of a hosted-password owner, including explicitly linked
 * providers. Provider outages do not revoke sessions or discard local progress. */
export async function checkHostedCredentialState(database: D1Database, userId: string,
  adminFor: (projectId: string) => Promise<Pick<FirebaseAuthAdmin, 'lookup'>> = hostedFirebaseAdmin,
  now = Date.now()): Promise<HostedCredentialVersion | null> {
  const alias = await database.prepare(`SELECT project_id AS projectId, firebase_uid AS uid,
    normalized_email AS email FROM hosted_hanzi_aliases WHERE user_id=? LIMIT 1`).bind(userId).first<Alias>();
  if (!alias) return null;
  let credential: FirebaseCredentialState | null;
  try { credential = await (await adminFor(alias.projectId)).lookup(alias.uid); }
  catch { throw unavailable(); }
  if (!credential || credential.uid !== alias.uid || credential.email !== alias.email || credential.disabled) {
    await database.prepare('UPDATE auth_sessions SET revoked_at=MAX(created_at,?) WHERE user_id=? AND revoked_at IS NULL')
      .bind(now, userId).run();
    throw new HostedCredentialRejectedError('Hosted credential unavailable.');
  }
  const { passwordUpdatedAt, validSince } = credential;
  // A stale provider response cannot roll back the fence or revoke sessions
  // minted with a newer credential. Both operations share one D1 transaction.
  const results = await database.batch([
    // Also cover sessions created before the first fence was observed. Google
    // validSince is in seconds; D1 session authentication time is milliseconds.
    database.prepare(`UPDATE auth_sessions SET revoked_at=MAX(created_at,?) WHERE user_id=? AND revoked_at IS NULL
      AND (authenticated_at<? OR authenticated_at<?)
      AND NOT EXISTS(SELECT 1 FROM hosted_credential_states WHERE user_id=?
        AND (password_updated_at>? OR valid_since>?))`)
      .bind(now, userId, validSince * 1000, passwordUpdatedAt, userId, passwordUpdatedAt, validSince),
    database.prepare(`UPDATE auth_sessions SET revoked_at=MAX(created_at,?) WHERE user_id=? AND revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM hosted_credential_states WHERE user_id=?
        AND password_updated_at<=? AND valid_since<=?
        AND (password_updated_at<>? OR valid_since<>?))`)
      .bind(now, userId, userId, passwordUpdatedAt, validSince, passwordUpdatedAt, validSince),
    database.prepare(`INSERT INTO hosted_credential_states(user_id,password_updated_at,valid_since,observed_at)
      VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET password_updated_at=excluded.password_updated_at,
      valid_since=excluded.valid_since,observed_at=excluded.observed_at
      WHERE excluded.password_updated_at>=hosted_credential_states.password_updated_at
        AND excluded.valid_since>=hosted_credential_states.valid_since`)
      .bind(userId, passwordUpdatedAt, validSince, now),
  ]);
  if (results.some(result => !result.success)) throw unavailable();
  const current = await database.prepare(`SELECT password_updated_at AS passwordUpdatedAt,valid_since AS validSince
    FROM hosted_credential_states WHERE user_id=?`).bind(userId).first<HostedCredentialVersion>();
  if (!current || current.passwordUpdatedAt !== passwordUpdatedAt || current.validSince !== validSince) {
    // A concurrent lookup can have observed a newer provider version. This
    // older reply cannot prove that the current session itself is invalid.
    throw unavailable();
  }
  return current;
}
