import { describe, expect, it, vi } from 'vitest';
import { bytesToBase64Url } from '../auth/authCrypto';
import { registerFirebasePassword, signInFirebasePassword } from './firebasePasswordIdentity';

const config = { projectId: 'hanzi-fixture', apiKey: 'fixture-key' };
const now = 1800000000;
const encode = (value: unknown) => bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
const proof = (extra = {}) => `${encode({ alg: 'RS256', kid: 'key' })}.${encode({
  aud: config.projectId, iss: `https://securetoken.google.com/${config.projectId}`, sub: 'fixture-uid',
  exp: now + 3600, iat: now, auth_time: now, firebase: { sign_in_provider: 'password' }, ...extra,
})}.signature`;
const account = { localId: 'fixture-uid', email: 'fixture@example.invalid', emailVerified: true,
  passwordUpdatedAt: (now - 10) * 1000, validSince: String(now - 10), providerUserInfo: [{ providerId: 'password' }] };
describe('hosted password trusted provider boundary', () => {
  it('rejects redirects without forwarding a password or provider token', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 307,
      headers: { location: 'https://untrusted.example/password' } }));
    await expect(signInFirebasePassword(config, account.email, 'private-password', fetcher, now))
      .rejects.toThrow('Password service redirected.');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('manual');
  });
  it('requires the live provider lookup as well as project and fresh password claims', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ idToken: proof() }))
      .mockResolvedValueOnce(Response.json({ users: [account] }));
    const result = await signInFirebasePassword(config, account.email, 'private-password', fetcher, now);
    expect(result).toMatchObject({ uid: 'fixture-uid', projectId: config.projectId, emailVerified: true });
    expect(fetcher).toHaveBeenNthCalledWith(2, expect.stringContaining('/accounts:lookup?'), expect.objectContaining({ redirect: 'manual' }));
  });
  it.each([{ aud: 'other-project' }, { auth_time: now - 400 }, { exp: now - 1 }, { firebase: { sign_in_provider: 'google.com' } }])('rejects unsuitable claims %j', async extra => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ idToken: proof(extra) }));
    await expect(signInFirebasePassword(config, account.email, 'password', fetcher, now)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects lookup identity mismatch and does not trust a decoded token alone', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ idToken: proof() }))
      .mockResolvedValueOnce(Response.json({ users: [{ ...account, localId: 'different' }] }));
    await expect(signInFirebasePassword(config, account.email, 'password', fetcher, now)).rejects.toThrow();
  });
  it.each([
    { validSince: String(now - 1) },
    { passwordUpdatedAt: (now - 1) * 1000 },
    { validSince: 'invalid' },
    { passwordUpdatedAt: 'invalid' },
  ])('rejects a proof authenticated before the provider reset or an invalid fence %j', async extra => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ idToken: proof({ auth_time: now - 5 }) }))
      .mockResolvedValueOnce(Response.json({ users: [{ ...account, ...extra }] }));
    await expect(signInFirebasePassword(config, account.email, 'password', fetcher, now)).rejects.toThrow();
  });
  it('carries only the observed credential version and fresh authentication time into session issuance', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ idToken: proof() }))
      .mockResolvedValueOnce(Response.json({ users: [account] }));
    expect(await signInFirebasePassword(config, account.email, 'password', fetcher, now)).toMatchObject({
      passwordUpdatedAt: account.passwordUpdatedAt, validSince: now - 10, authenticatedAt: now * 1000,
    });
  });
  it('recovers a provider-only registration only after proving its password', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ error: { message: 'EMAIL_EXISTS' } }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ idToken: proof() })).mockResolvedValueOnce(Response.json({ users: [account] }));
    expect(await registerFirebasePassword(config, account.email, 'Fixture-password-2026', fetcher, now)).toMatchObject({ created: false });
    expect(fetcher.mock.calls[1]?.[0]).toContain('accounts:signInWithPassword');
  });
});
