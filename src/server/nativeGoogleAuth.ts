import { constantTimeEqual, randomBase64Url, sha256Base64Url } from '../auth/authCrypto';
import type { AuthRepository } from './authRepository';
import { verifyGoogleIdToken } from './googleIdentity';

const opaque = /^[A-Za-z0-9_-]{43}$/u;
export async function startNativeGoogle(repository: AuthRepository, codeChallenge: unknown) {
  if (typeof codeChallenge !== 'string' || !opaque.test(codeChallenge)) throw new Error('Invalid device binding');
  const nonce = randomBase64Url();
  const challenge = await repository.createChallenge({ kind: 'google_signin', provider: 'google',
    payload: { mobilePhase: 'native-google', codeChallenge, nonce }, ttlMs: 300_000 });
  return { challenge, nonce };
}

export async function finishNativeGoogle(repository: AuthRepository, clientId: string, input: {
  challenge?: unknown; verifier?: unknown; idToken?: unknown;
}, verify = verifyGoogleIdToken) {
  if (typeof input.challenge !== 'string' || !opaque.test(input.challenge)
    || typeof input.verifier !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/u.test(input.verifier)
    || typeof input.idToken !== 'string' || input.idToken.length > 16_384) throw new Error('Invalid Google proof');
  const challenge = await repository.verifyChallenge(input.challenge, 'google_signin');
  if (challenge.payload.mobilePhase !== 'native-google' || typeof challenge.payload.nonce !== 'string'
    || typeof challenge.payload.codeChallenge !== 'string'
    || !constantTimeEqual(await sha256Base64Url(input.verifier), challenge.payload.codeChallenge)) throw new Error('Invalid device binding');
  const identity = await verify({ idToken: input.idToken, clientId, nonce: challenge.payload.nonce });
  await repository.consumeChallenge(challenge);
  const linked = await repository.resolveOrCreateIdentity({ provider: 'google', ...identity });
  const session = await repository.createSession({ userId: linked.userId, identityId: linked.identityId,
    authMethod: 'google', deviceLabel: 'HANZI.OS Android' });
  return { session, linked, identity };
}
