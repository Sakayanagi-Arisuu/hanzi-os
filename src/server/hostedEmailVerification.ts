import type { D1Database } from './d1';
import type { FirebaseAuthAdmin } from './firebaseAuthAdmin';
import { FirebaseAuthAdminUnavailableError } from './firebaseAuthAdmin';
import { hostedFirebaseAdmin } from './hostedCredentialState';
import { consumeAuthPasswordRateLimit } from './authPasswordRateLimit';
import { AuthPasswordRateLimitedError } from './hostedHanziAuth';
import { assertAccountCanAuthenticate } from './accountStatus';
import { confirmFirebaseEmailAction, FirebaseEmailActionInvalidError, FirebasePasswordRejectedError,
  requestFirebaseEmailVerification, signInFirebasePassword, verifyFirebaseEmailAction, type FirebasePasswordConfig } from './firebasePasswordIdentity';

type Alias = { userId: string; identityId: string; projectId: string; uid: string; email: string };
type AdminFor = (projectId: string) => Promise<Pick<FirebaseAuthAdmin, 'lookup'>>;
const unavailable = () => new FirebaseAuthAdminUnavailableError('Email verification unavailable.');
const columns = 'user_id AS userId,identity_id AS identityId,project_id AS projectId,firebase_uid AS uid,normalized_email AS email';
const aliasFor = (database: D1Database, userId: string, projectId: string) => database.prepare(
  `SELECT ${columns} FROM hosted_hanzi_aliases WHERE user_id=? AND project_id=? LIMIT 1`).bind(userId, projectId).first<Alias>();

async function recordVerification(database: D1Database, alias: Alias, verified: boolean) {
  const result = await database.prepare(`UPDATE auth_identities SET email_verified=?,updated_at=?
    WHERE id=? AND user_id=? AND provider='hanzi' AND provider_subject=? AND normalized_email=?
    AND EXISTS(SELECT 1 FROM hosted_hanzi_aliases WHERE user_id=? AND identity_id=? AND project_id=? AND firebase_uid=? AND normalized_email=?)
    AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='active')`)
    .bind(verified ? 1 : 0, Date.now(), alias.identityId, alias.userId, `firebase:${alias.projectId}:${alias.uid}`, alias.email,
      alias.userId, alias.identityId, alias.projectId, alias.uid, alias.email, alias.userId).run();
  if (!result.success || result.meta?.changes !== 1) throw unavailable();
}

export async function readHostedEmailVerification(database: D1Database, userId: string, projectId: string, adminFor: AdminFor = hostedFirebaseAdmin) {
  const alias = await aliasFor(database, userId, projectId);
  if (!alias) return { available: false as const };
  await assertAccountCanAuthenticate(database, alias.userId);
  const credential = await (await adminFor(alias.projectId)).lookup(alias.uid);
  if (!credential || credential.disabled || credential.uid !== alias.uid || credential.email !== alias.email) throw unavailable();
  await recordVerification(database, alias, credential.emailVerified);
  return { available: true as const, email: alias.email, verified: credential.emailVerified };
}

export async function sendHostedEmailVerification(database: D1Database, request: Request, userId: string, config: FirebasePasswordConfig, password: string) {
  if (!password || [...password].length > 128 || new TextEncoder().encode(password).byteLength > 256) {
    throw new FirebasePasswordRejectedError('Password proof invalid.');
  }
  const alias = await aliasFor(database, userId, config.projectId);
  if (!alias) throw new FirebasePasswordRejectedError('Password identity unavailable.');
  await assertAccountCanAuthenticate(database, userId);
  if (!await consumeAuthPasswordRateLimit(database, request, alias.email, Date.now(), 'email-verification')) {
    throw new AuthPasswordRateLimitedError('Verification rate limit reached.');
  }
  const identity = await signInFirebasePassword(config, alias.email, password);
  if (identity.uid !== alias.uid || identity.projectId !== alias.projectId || identity.email !== alias.email) {
    throw new FirebasePasswordRejectedError('Password identity mismatch.');
  }
  await recordVerification(database, alias, identity.emailVerified);
  if (identity.emailVerified) return { accepted: false, verified: true };
  // No email, token, callback or UID is accepted from the caller.
  await requestFirebaseEmailVerification(config, identity);
  return { accepted: true, verified: false };
}

export async function processHostedEmailAction(database: D1Database, config: FirebasePasswordConfig, code: string, confirm: boolean) {
  const email = await verifyFirebaseEmailAction(config, code);
  const alias = await database.prepare(`SELECT ${columns} FROM hosted_hanzi_aliases WHERE project_id=? AND normalized_email=? LIMIT 1`)
    .bind(config.projectId, email).first<Alias>();
  if (!alias) throw new FirebaseEmailActionInvalidError('Email action has no HANZI identity.');
  await assertAccountCanAuthenticate(database, alias.userId);
  if (!confirm) return { valid: true };
  await confirmFirebaseEmailAction(config, code, alias.email, alias.uid);
  await recordVerification(database, alias, true);
  return { verified: true };
}
