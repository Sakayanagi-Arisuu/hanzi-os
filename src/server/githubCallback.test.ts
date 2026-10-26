import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubIdentityError } from './githubIdentity';

const mocks = vi.hoisted(() => ({
  repository: {
    verifyChallenge: vi.fn(), consumeChallenge: vi.fn(), resolveOrCreateIdentity: vi.fn(),
    createSession: vi.fn(), createChallenge: vi.fn(), unlinkIdentity: vi.fn(),
  },
  exchange: vi.fn(), profile: vi.fn(), audit: vi.fn(),
}));
vi.mock('./authHttp', async original => ({
  ...await original<typeof import('./authHttp')>(),
  loadAuthRuntime: vi.fn(async () => ({
    repository: mocks.repository,
    database: { prepare: () => ({ bind: () => ({ run: mocks.profile }) }) },
    environment: { GITHUB_CLIENT_ID: 'fixture-client', GITHUB_CLIENT_SECRET: 'fixture-secret',
      GITHUB_REDIRECT_URI: 'https://hanzi.example/auth/github/callback' },
  })),
}));
vi.mock('./githubIdentity', async original => ({
  ...await original<typeof import('./githubIdentity')>(), exchangeGithubAuthorizationCode: mocks.exchange,
}));
vi.mock('./authorizationRepository', () => ({ AuthorizationRepository: class {
  getAuthorization = vi.fn(async () => ({ roles: ['learner'] }));
} }));
vi.mock('./auditRepository', () => ({ AuditRepository: class { appendBestEffort = mocks.audit; }, requestCorrelationId: () => 'fixture-request' }));
import { GET } from '../../app/auth/github/callback/route';

const state = 'a'.repeat(43);
const request = (cookie = `__Host-hanzi_github_state=${state}`) => new Request(
  `https://hanzi.example/auth/github/callback?state=${state}&code=fixture-code`, { headers: { cookie } },
);
const challenge = { kind: 'github_signin', payload: { verifier: 'fixture-verifier', returnTo: '/path' } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.repository.verifyChallenge.mockResolvedValue(challenge);
  mocks.repository.consumeChallenge.mockResolvedValue(undefined);
  mocks.repository.resolveOrCreateIdentity.mockResolvedValue({ userId: 'github-owner', identityId: 'github-identity', created: false });
  mocks.repository.createSession.mockResolvedValue({ token: 's'.repeat(43), sessionId: 'fixture-session' });
  mocks.repository.createChallenge.mockResolvedValue('c'.repeat(43));
  mocks.exchange.mockResolvedValue({ providerSubject: '12345', email: 'shared@example.invalid', emailVerified: true, displayName: 'Fixture' });
});

describe('GitHub callback authority', () => {
  it.each(['', `__Host-hanzi_github_state=${'b'.repeat(43)}`,
    `__Host-hanzi_github_state=${state}; __Host-hanzi_github_state=${state}`])(
    'rejects a missing, foreign or duplicate browser binding before contacting GitHub (%s)', async cookie => {
      const response = await GET(request(cookie));
      expect(response.headers.get('location')).toContain('error=github_state');
      expect(mocks.exchange).not.toHaveBeenCalled();
      expect(mocks.repository.createSession).not.toHaveBeenCalled();
    },
  );
  it('consumes the challenge before issuing a session and preserves the learner destination', async () => {
    const response = await GET(request());
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://hanzi.example/path');
    expect(response.headers.get('set-cookie')).toContain('__Host-hanzi_session=');
    expect(response.headers.get('set-cookie')).toContain('__Host-hanzi_github_state=;');
    expect(response.headers.get('cache-control')).toContain('no-store');
    // Email is metadata; a normal sign-in never asks to link a Google owner.
    expect(mocks.repository.resolveOrCreateIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: 'github', providerSubject: '12345' }), undefined);
    expect(mocks.repository.consumeChallenge.mock.invocationCallOrder[0]).toBeLessThan(mocks.repository.createSession.mock.invocationCallOrder[0]!);
  });
  it('does not create or link an owner if atomic consumption fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      mocks.repository.consumeChallenge.mockRejectedValueOnce(new Error('already consumed'));
      expect((await GET(request())).headers.get('location')).toContain('error=github_failed');
      expect(mocks.repository.resolveOrCreateIdentity).not.toHaveBeenCalled();
      expect(mocks.repository.createSession).not.toHaveBeenCalled();
    } finally { warning.mockRestore(); }
  });
  it('does not issue a session after a provider failure or expose provider details', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      mocks.exchange.mockRejectedValueOnce(new GithubIdentityError('GitHub provider request failed (307).'));
      const response = await GET(request());
      expect(response.headers.get('location')).toBe('https://hanzi.example/signin?error=github_failed');
      expect(await response.text()).toBe('');
      expect(mocks.repository.consumeChallenge).not.toHaveBeenCalled();
      expect(mocks.repository.createSession).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledWith('GitHub sign-in failed', { stage: 'provider', reason: 'GitHub provider request failed (307).' });
    } finally { warning.mockRestore(); }
  });
  it('returns a short-lived S256 exchange to Android without a browser session cookie', async () => {
    mocks.repository.verifyChallenge.mockResolvedValueOnce({ ...challenge,
      payload: { ...challenge.payload, mobileCodeChallenge: 'b'.repeat(43) } });
    const response = await GET(request());
    expect(response.headers.get('location')).toBe('com.regulus.hanzios://auth?code=' + 'c'.repeat(43));
    expect(response.headers.get('set-cookie')).not.toContain('__Host-hanzi_session');
    expect(mocks.repository.createSession).not.toHaveBeenCalled();
    expect(mocks.repository.createChallenge).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'github', userId: 'github-owner', ttlMs: 60000,
      payload: { mobilePhase: 'exchange', codeChallenge: 'b'.repeat(43), identityId: 'github-identity' },
    }));
  });
});
