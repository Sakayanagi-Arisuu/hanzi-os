import type { D1Database } from './d1';
import { InvalidHanziCredentialsError } from './authRepository';
import { validateHanziRegistration, type HanziRegistrationInput } from './hanziPassword';
import { consumeAuthPasswordRateLimit } from './authPasswordRateLimit';
import { HostedHanziRepository } from './hostedHanziRepository';
import { deleteFreshFirebasePassword, registerFirebasePassword, signInFirebasePassword, type FirebasePasswordConfig } from './firebasePasswordIdentity';
import { checkHostedCredentialState } from './hostedCredentialState';

export class AuthPasswordRateLimitedError extends Error {}
const consume = async (database: D1Database, request: Request, identifier: string) => {
  if (!await consumeAuthPasswordRateLimit(database, request, identifier)) throw new AuthPasswordRateLimitedError('Too many authentication attempts.');
};

export async function authenticateHostedHanzi(database: D1Database, request: Request, config: FirebasePasswordConfig, identifier: string, password: string) {
  if (password.length < 1 || [...password].length > 128 || new TextEncoder().encode(password).byteLength > 256) {
    throw new InvalidHanziCredentialsError('Credentials invalid.');
  }
  await consume(database, request, identifier);
  const repository = new HostedHanziRepository(database);
  const alias = await repository.findIdentifier(identifier, config.projectId);
  const before = alias ? await checkHostedCredentialState(database, alias.userId) : null;
  // Missing aliases still traverse the provider boundary. Public error and
  // status remain identical; no existing Firebase user is adopted by email.
  const proof = await signInFirebasePassword(config, alias?.email ?? `${crypto.randomUUID()}@missing.invalid`, password);
  // Provider auth_time has second precision. Comparing the credential before
  // and after the exchange also fences a reset within that same second.
  if (before && (before.passwordUpdatedAt !== proof.passwordUpdatedAt || before.validSince !== proof.validSince)) {
    throw new InvalidHanziCredentialsError('Password authority changed.');
  }
  return { ...await repository.authenticate(alias, proof), hostedCredential: {
    passwordUpdatedAt: proof.passwordUpdatedAt, validSince: proof.validSince, authenticatedAt: proof.authenticatedAt,
  } };
}

export async function registerHostedHanzi(database: D1Database, request: Request, config: FirebasePasswordConfig, input: HanziRegistrationInput) {
  const normalized = validateHanziRegistration(input);
  await consume(database, request, normalized.email);
  const repository = new HostedHanziRepository(database);
  await repository.assertRegistrationAllowed(normalized, config.projectId);
  const registered = await registerFirebasePassword(config, normalized.email, normalized.password);
  try {
    return { ...await repository.register(normalized, registered.identity), hostedCredential: {
      passwordUpdatedAt: registered.identity.passwordUpdatedAt, validSince: registered.identity.validSince,
      authenticatedAt: registered.identity.authenticatedAt,
    } };
  } catch (error) {
    if (registered.created) {
      // A lost D1 reply may have committed. Delete an external credential only
      // after proving no owner mapping exists; outages fail closed. A retry can
      // recover a provider-only account by proving its password.
      try {
        if (!await repository.findUid(config.projectId, registered.identity.uid)) {
          await deleteFreshFirebasePassword(config, registered.identity);
        }
      } catch { /* preserve an uncertain account and let registration retry */ }
    }
    throw error;
  }
}
