import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ consume: vi.fn(), findIdentifier: vi.fn(), authenticate: vi.fn(), check: vi.fn(), signIn: vi.fn() }));
vi.mock('./authPasswordRateLimit', () => ({ consumeAuthPasswordRateLimit: mocks.consume }));
vi.mock('./hostedHanziRepository', () => ({ HostedHanziRepository: class {
  findIdentifier = mocks.findIdentifier; authenticate = mocks.authenticate;
} }));
vi.mock('./hostedCredentialState', () => ({ checkHostedCredentialState: mocks.check }));
vi.mock('./firebasePasswordIdentity', async importOriginal => ({
  ...await importOriginal<typeof import('./firebasePasswordIdentity')>(), signInFirebasePassword: mocks.signIn,
}));
import { authenticateHostedHanzi } from './hostedHanziAuth';
import { InvalidHanziCredentialsError } from './authRepository';
import type { D1Database } from './d1';
const database = {} as D1Database;
const request = new Request('https://hanzi.test/api/auth/hanzi/login');
const config = { projectId: 'hanzi-fixture', apiKey: 'fixture' };
const version = { passwordUpdatedAt: 100_100, validSince: 100 };
const account = { userId: 'owner', identityId: 'identity', email: 'owner@example.invalid' };
beforeEach(() => {
  vi.resetAllMocks(); mocks.consume.mockResolvedValue(true); mocks.findIdentifier.mockResolvedValue(account);
  mocks.check.mockResolvedValue(version); mocks.signIn.mockResolvedValue({ ...version, authenticatedAt: 100_000 });
  mocks.authenticate.mockResolvedValue(account);
});
describe('hosted password exchange authority', () => {
  it('compares the version before and after exchanging the password and carries it to session issuance', async () => {
    expect(await authenticateHostedHanzi(database, request, config, 'fixture.owner', 'fixture-password'))
      .toMatchObject({ userId: 'owner', hostedCredential: { ...version, authenticatedAt: 100_000 } });
    expect(mocks.check.mock.invocationCallOrder[0]).toBeLessThan(mocks.signIn.mock.invocationCallOrder[0]!);
  });
  it('rejects an old proof when the password changes within the same auth_time second', async () => {
    mocks.signIn.mockResolvedValue({ ...version, passwordUpdatedAt: 100_900, authenticatedAt: 100_000 });
    await expect(authenticateHostedHanzi(database, request, config, 'fixture.owner', 'fixture-password'))
      .rejects.toBeInstanceOf(InvalidHanziCredentialsError);
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
  it('still crosses the provider boundary for a missing local alias without adopting a user by email', async () => {
    mocks.findIdentifier.mockResolvedValue(null);
    mocks.signIn.mockRejectedValue(new InvalidHanziCredentialsError('Credentials invalid.'));
    await expect(authenticateHostedHanzi(database, request, config, 'missing.owner', 'fixture-password')).rejects.toThrow();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.signIn).toHaveBeenCalledWith(config, expect.stringMatching(/@missing\.invalid$/u), 'fixture-password');
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
});
