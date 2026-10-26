import { constantTimeEqual, sha256Base64Url } from '../auth/authCrypto';
import type { AuthRepository } from './authRepository';

const opaque = /^[A-Za-z0-9_-]{43}$/;
export const MOBILE_CALLBACK = 'com.regulus.hanzios://auth';
export type MobileOAuthProvider = 'google' | 'github';

/** Mobile ceremonies use the existing one-time Google challenge table, with
 * explicit phases. They cannot be used as Google authorization states. */
export async function createMobileStart(repository: AuthRepository, codeChallenge: unknown, provider: MobileOAuthProvider = 'google') {
  if (typeof codeChallenge !== 'string' || !opaque.test(codeChallenge)) throw new Error('Invalid S256 challenge');
  return repository.createChallenge({ kind: `${provider}_signin`, provider,
    payload: { mobilePhase: 'start', codeChallenge }, ttlMs: 5 * 60_000 });
}

export async function consumeMobileStart(repository: AuthRepository, code: string, provider: MobileOAuthProvider = 'google') {
  const challenge = await repository.verifyChallenge(code, `${provider}_signin`);
  if (challenge.payload.mobilePhase !== 'start' || typeof challenge.payload.codeChallenge !== 'string'
    || !opaque.test(challenge.payload.codeChallenge)) throw new Error('Invalid mobile start');
  await repository.consumeChallenge(challenge);
  return challenge.payload.codeChallenge;
}

export async function createMobileCompletion(repository: AuthRepository, input: {
  userId: string; identityId: string; codeChallenge: string; provider?: MobileOAuthProvider;
}) {
  if (!opaque.test(input.codeChallenge)) throw new Error('Invalid mobile binding');
  const provider = input.provider ?? 'google';
  const code = await repository.createChallenge({ kind: `${provider}_signin`, provider, userId: input.userId,
    payload: { mobilePhase: 'exchange', codeChallenge: input.codeChallenge, identityId: input.identityId }, ttlMs: 60_000 });
  return `${MOBILE_CALLBACK}?code=${encodeURIComponent(code)}`;
}

export async function exchangeMobileCompletion(repository: AuthRepository, code: unknown, verifier: unknown, provider: MobileOAuthProvider = 'google') {
  if (typeof code !== 'string' || !opaque.test(code) || typeof verifier !== 'string'
    || !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) throw new Error('Invalid mobile exchange');
  const challenge = await repository.verifyChallenge(code, `${provider}_signin`);
  if (challenge.payload.mobilePhase !== 'exchange' || !challenge.userId
    || typeof challenge.payload.identityId !== 'string' || typeof challenge.payload.codeChallenge !== 'string'
    || !constantTimeEqual(await sha256Base64Url(verifier), challenge.payload.codeChallenge)) throw new Error('Invalid mobile verifier');
  // Atomic consume precedes issuing a session: parallel requests cannot mint
  // multiple sessions. Failure is closed; a new login is safe to retry.
  await repository.consumeChallenge(challenge);
  return repository.createSession({ userId: challenge.userId, identityId: challenge.payload.identityId,
    authMethod: provider, deviceLabel: 'HANZI.OS Android' });
}
