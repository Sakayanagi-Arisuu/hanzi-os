import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  repository: { createChallenge: vi.fn(), verifyChallenge: vi.fn(), consumeChallenge: vi.fn(), resolveOrCreateIdentity: vi.fn(), createSession: vi.fn() },
  google: vi.fn(),
}));
vi.mock('../../app/chatgpt-auth', () => ({ getAuthenticatedUser: vi.fn().mockResolvedValue(null) }));
vi.mock('./authHttp', async original => ({
  ...await original<typeof import('./authHttp')>(),
  loadAuthRuntime: vi.fn().mockImplementation(async () => ({ repository: mocks.repository, database: {}, environment: {} })),
  googleConfig: vi.fn().mockReturnValue({ clientId: 'test-client', clientSecret: 'test-only', redirectUri: 'https://hanzi.example/auth/google/callback' }),
}));
vi.mock('./googleIdentity', async original => ({
  ...await original<typeof import('./googleIdentity')>(), exchangeGoogleAuthorizationCode: mocks.google,
}));
import { POST as start } from '../../app/api/auth/mobile/start/route';
import { POST as exchange } from '../../app/api/auth/mobile/exchange/route';
import { GET as callback } from '../../app/auth/google/callback/route';

beforeEach(() => { vi.clearAllMocks(); });
describe('mobile OAuth HTTP boundaries', () => {
  it('does not start or exchange from a foreign browser origin', async () => {
    const request = () => new Request('https://hanzi.example/api/auth/mobile/start', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
    expect((await start(request())).status).toBe(403);
    expect((await exchange(request())).status).toBe(403);
    expect(mocks.repository.createChallenge).not.toHaveBeenCalled();
    expect(mocks.repository.createSession).not.toHaveBeenCalled();
  });
  it('requires the normal Google browser binding before any mobile callback', async () => {
    const response = await callback(new Request(`https://hanzi.example/auth/google/callback?state=${'a'.repeat(43)}&code=test`));
    expect(response.headers.get('location')).toContain('error=google_state');
    expect(mocks.google).not.toHaveBeenCalled();
    expect(mocks.repository.createSession).not.toHaveBeenCalled();
  });
  it('redirects an authenticated Google identity with an exchange code, never a session token or browser cookie', async () => {
    const state = 'a'.repeat(43);
    mocks.repository.verifyChallenge.mockResolvedValue({ kind: 'google_signin', payload: { verifier: 'google-verifier', nonce: 'google-nonce', mobileCodeChallenge: 'b'.repeat(43) } });
    mocks.google.mockResolvedValue({ providerSubject: 'google-subject', email: 'fixture@example.invalid', emailVerified: true, displayName: 'Fixture' });
    mocks.repository.resolveOrCreateIdentity.mockResolvedValue({ userId: 'fixture-owner', identityId: 'fixture-identity' });
    mocks.repository.createChallenge.mockResolvedValue('c'.repeat(43));
    const response = await callback(new Request(`https://hanzi.example/auth/google/callback?state=${state}&code=google-code`, {
      headers: { cookie: `__Host-hanzi_google_state=${state}` },
    }));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('com.regulus.hanzios://auth?code=' + 'c'.repeat(43));
    expect(response.headers.get('set-cookie')).not.toContain('__Host-hanzi_session');
    expect(mocks.repository.createSession).not.toHaveBeenCalled();
    expect(mocks.repository.createChallenge).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'fixture-owner', ttlMs: 60000, payload: { mobilePhase: 'exchange', identityId: 'fixture-identity', codeChallenge: 'b'.repeat(43) },
    }));
  });
});
