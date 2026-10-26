import { base64UrlToBytes } from '../auth/authCrypto';
import { readBoundedRequestText } from './boundedRequestBody';
import { hanziPasswordMeetsPolicy, HANZI_PASSWORD_POLICY_MESSAGE } from '../auth/hanziPasswordPolicy';
import { validPasswordResetCode } from '../auth/passwordResetAction';

export type FirebasePasswordConfig = { projectId: string; apiKey: string };
export type FirebasePasswordIdentity = {
  uid: string; email: string; emailVerified: boolean; projectId: string;
  passwordUpdatedAt: number; validSince: number; authenticatedAt: number;
  /** Server-only, short-lived proof for registration compensation. Never expose to a client. */
  idToken: string;
};
export class FirebasePasswordUnavailableError extends Error {}
export class FirebasePasswordRejectedError extends Error {}
class FirebasePasswordAccountUnavailableError extends FirebasePasswordRejectedError {}
export class FirebaseEmailConflictError extends Error {}
export class FirebasePasswordActionInvalidError extends Error {}
export class FirebasePasswordPolicyError extends Error {}
export class FirebaseEmailActionInvalidError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Only fixed Google HTTPS endpoints are accepted. No client-supplied token or endpoint enters this adapter. */
async function request(config: FirebasePasswordConfig, operation: string, body: Record<string, unknown>, fetcher: typeof fetch) {
  let response: Response;
  try {
    response = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(config.apiKey)}`, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(12_000),
      headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body),
    });
  } catch { throw new FirebasePasswordUnavailableError('Password service unavailable.'); }
  // Manual + rejecting redirects keeps secrets at the fixed Google endpoint.
  if (response.status >= 300 && response.status < 400) throw new FirebasePasswordUnavailableError('Password service redirected.');
  const bounded = await readBoundedRequestText(new Request('https://reply.invalid', { method: 'POST', body: response.body, duplex: 'half' } as RequestInit), 65_536);
  if (!bounded.ok) throw new FirebasePasswordUnavailableError('Password service reply invalid.');
  let payload: Record<string, unknown>;
  try { payload = record(JSON.parse(bounded.text)); }
  catch { throw new FirebasePasswordUnavailableError('Password service reply invalid.'); }
  if (!response.ok) {
    const error = record(payload.error).message;
    if (operation === 'resetPassword' || operation === 'update') {
      if (['EXPIRED_OOB_CODE', 'INVALID_OOB_CODE', 'EMAIL_NOT_FOUND', 'USER_DISABLED'].includes(String(error))) {
        throw operation === 'update' ? new FirebaseEmailActionInvalidError('Email action no longer valid.')
          : new FirebasePasswordActionInvalidError('Password action no longer valid.');
      }
      if (typeof error === 'string' && /^(WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET_REQUIREMENTS)(?:\s*:\s*.*)?$/u.test(error)) {
        throw new FirebasePasswordPolicyError(HANZI_PASSWORD_POLICY_MESSAGE);
      }
      // Unknown action errors are infrastructure failures, never a claim that
      // the reset succeeded or that a specific account/code exists.
      throw new FirebasePasswordUnavailableError('Password service unavailable.');
    }
    if (error === 'EMAIL_NOT_FOUND' || error === 'USER_DISABLED') throw new FirebasePasswordAccountUnavailableError('Password account unavailable.');
    if (error === 'EMAIL_EXISTS') throw new FirebaseEmailConflictError('Email already registered.');
    if (response.status >= 500 || response.status === 429 || error === 'OPERATION_NOT_ALLOWED'
      || error === 'API_KEY_INVALID' || error === 'CONFIGURATION_NOT_FOUND') {
      throw new FirebasePasswordUnavailableError('Password service unavailable.');
    }
    throw new FirebasePasswordRejectedError('Credentials invalid.');
  }
  return payload;
}

function tokenClaims(token: string, config: FirebasePasswordConfig, now: number) {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 16_384) throw new FirebasePasswordRejectedError('Password proof invalid.');
  let claims: Record<string, unknown>;
  let header: Record<string, unknown>;
  try {
    header = record(JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]!))));
    claims = record(JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]!))));
  } catch { throw new FirebasePasswordRejectedError('Password proof invalid.'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid
    || claims.aud !== config.projectId || claims.iss !== `https://securetoken.google.com/${config.projectId}`
    || typeof claims.sub !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(claims.sub)
    || typeof claims.exp !== 'number' || claims.exp <= now
    || typeof claims.iat !== 'number' || claims.iat > now + 60 || claims.iat < now - 300
    || typeof claims.auth_time !== 'number' || claims.auth_time > now + 60 || claims.auth_time < now - 300
    || record(claims.firebase).sign_in_provider !== 'password') {
    throw new FirebasePasswordRejectedError('Password proof invalid.');
  }
  return { uid: claims.sub, authenticatedAt: claims.auth_time * 1000 };
}

async function passwordProof(config: FirebasePasswordConfig, payload: Record<string, unknown>, fetcher: typeof fetch, now: number) {
  const idToken = payload.idToken;
  if (typeof idToken !== 'string') throw new FirebasePasswordRejectedError('Password proof missing.');
  const { uid, authenticatedAt } = tokenClaims(idToken, config, now);
  // Google validates the signature, current account and token validity. Decoded
  // claims alone are never used as authentication; tokens came from a trusted
  // password exchange and are sent back to Google for this independent lookup.
  const lookup = await request(config, 'lookup', { idToken }, fetcher);
  const users = lookup.users;
  const account = Array.isArray(users) && users.length === 1 ? record(users[0]) : {};
  const email = typeof account.email === 'string' ? account.email.trim().toLowerCase() : '';
  const passwordUpdatedAt = account.passwordUpdatedAt;
  const validSince = typeof account.validSince === 'string' && /^\d{1,12}$/u.test(account.validSince) ? Number(account.validSince) : NaN;
  if (account.localId !== uid || account.disabled === true || !EMAIL.test(email) || email.length > 254
    || !Array.isArray(account.providerUserInfo)
    || !account.providerUserInfo.some(value => record(value).providerId === 'password')
    || typeof passwordUpdatedAt !== 'number' || !Number.isSafeInteger(passwordUpdatedAt) || passwordUpdatedAt < 0
    || !Number.isSafeInteger(validSince) || validSince < 0 || validSince * 1000 > authenticatedAt
    || passwordUpdatedAt >= authenticatedAt + 1000) {
    throw new FirebasePasswordRejectedError('Password account unavailable.');
  }
  return { uid, email, emailVerified: account.emailVerified === true, projectId: config.projectId, idToken,
    passwordUpdatedAt, validSince, authenticatedAt };
}

export async function signInFirebasePassword(config: FirebasePasswordConfig, email: string, password: string, fetcher: typeof fetch = fetch, now = Math.floor(Date.now() / 1_000)): Promise<FirebasePasswordIdentity> {
  const payload = await request(config, 'signInWithPassword', { email, password, returnSecureToken: true }, fetcher);
  return passwordProof(config, payload, fetcher, now);
}

export async function registerFirebasePassword(config: FirebasePasswordConfig, email: string, password: string, fetcher: typeof fetch = fetch, now = Math.floor(Date.now() / 1_000)) {
  if (!hanziPasswordMeetsPolicy(password)) throw new FirebasePasswordPolicyError(HANZI_PASSWORD_POLICY_MESSAGE);
  try {
    const payload = await request(config, 'signUp', { email, password, returnSecureToken: true }, fetcher);
    return { identity: await passwordProof(config, payload, fetcher, now), created: true };
  } catch (error) {
    if (!(error instanceof FirebaseEmailConflictError)) throw error;
    // Retry after a D1 registration rollback can recover an orphaned Firebase
    // account only by proving the same password. Email alone never links users.
    return { identity: await signInFirebasePassword(config, email, password, fetcher, now), created: false };
  }
}

export async function deleteFreshFirebasePassword(config: FirebasePasswordConfig, identity: FirebasePasswordIdentity, fetcher: typeof fetch = fetch) {
  if (identity.projectId !== config.projectId) throw new FirebasePasswordRejectedError('Wrong password project.');
  await request(config, 'delete', { idToken: identity.idToken }, fetcher);
}

/** Firebase sends its single-use action link. Never return its payload, token,
 * email-existence result or accept a caller-controlled continuation URL. */
export async function requestFirebasePasswordReset(config: FirebasePasswordConfig, email: string, fetcher: typeof fetch = fetch) {
  try {
    await request(config, 'sendOobCode', { requestType: 'PASSWORD_RESET', email }, fetcher);
  } catch (error) {
    // Firebase projects may have email enumeration protection enabled or disabled.
    // Both configurations must present the same public acknowledgement.
    if (!(error instanceof FirebasePasswordAccountUnavailableError)) throw error;
  }
}

/** Verify without consuming. The email remains server-only, never a public lookup. */
export async function verifyFirebasePasswordReset(config: FirebasePasswordConfig, oobCode: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!validPasswordResetCode(oobCode)) throw new FirebasePasswordActionInvalidError('Password action invalid.');
  const result = await request(config, 'resetPassword', { oobCode }, fetcher);
  const email = typeof result.email === 'string' ? result.email.trim().toLowerCase() : '';
  if (typeof result.requestType !== 'string' || !EMAIL.test(email) || email.length > 254) {
    throw new FirebasePasswordUnavailableError('Password action reply invalid.');
  }
  if (result.requestType !== 'PASSWORD_RESET') {
    throw new FirebasePasswordActionInvalidError('Password action invalid.');
  }
  return email;
}

/** Google atomically consumes the code. Never mint a session from a reset link. */
export async function confirmFirebasePasswordReset(config: FirebasePasswordConfig, oobCode: string, newPassword: string, fetcher: typeof fetch = fetch): Promise<void> {
  if (!hanziPasswordMeetsPolicy(newPassword)) throw new FirebasePasswordPolicyError(HANZI_PASSWORD_POLICY_MESSAGE);
  // Check the action type again immediately before mutation, even if the UI
  // already checked it. Verification links cannot be used as reset links.
  const email = await verifyFirebasePasswordReset(config, oobCode, fetcher);
  const result = await request(config, 'resetPassword', { oobCode, newPassword }, fetcher);
  if (result.requestType !== 'PASSWORD_RESET' || typeof result.email !== 'string'
    || result.email.trim().toLowerCase() !== email) {
    throw new FirebasePasswordUnavailableError('Password reset result uncertain.');
  }
}

/** Dispatch only after a fresh server-side password proof for the bound UID. */
export async function requestFirebaseEmailVerification(config: FirebasePasswordConfig, identity: FirebasePasswordIdentity, fetcher: typeof fetch = fetch) {
  if (identity.projectId !== config.projectId || !identity.idToken) throw new FirebasePasswordRejectedError('Wrong email verification identity.');
  await request(config, 'sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: identity.idToken }, fetcher);
}

export async function verifyFirebaseEmailAction(config: FirebasePasswordConfig, oobCode: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!validPasswordResetCode(oobCode)) throw new FirebaseEmailActionInvalidError('Email action invalid.');
  let result: Record<string, unknown>;
  try { result = await request(config, 'resetPassword', { oobCode }, fetcher); }
  catch (error) {
    if (error instanceof FirebasePasswordActionInvalidError) throw new FirebaseEmailActionInvalidError('Email action no longer valid.');
    throw error;
  }
  const email = typeof result.email === 'string' ? result.email.trim().toLowerCase() : '';
  if (typeof result.requestType !== 'string' || !EMAIL.test(email) || email.length > 254) {
    throw new FirebasePasswordUnavailableError('Email action reply invalid.');
  }
  if (result.requestType !== 'VERIFY_EMAIL') throw new FirebaseEmailActionInvalidError('Wrong email action.');
  return email;
}

/** One-time email action changes no password and never mints an app session. */
export async function confirmFirebaseEmailAction(config: FirebasePasswordConfig, oobCode: string, expectedEmail: string, expectedUid: string, fetcher: typeof fetch = fetch) {
  const result = await request(config, 'update', { oobCode, returnSecureToken: false }, fetcher);
  if (result.localId !== expectedUid || typeof result.email !== 'string' || result.email.trim().toLowerCase() !== expectedEmail || result.emailVerified !== true) {
    throw new FirebasePasswordUnavailableError('Email action result uncertain.');
  }
}
