import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FixtureD1 } from './testing/FixtureD1';
import { bytesToBase64Url } from '../auth/authCrypto';
const mocks = vi.hoisted(() => ({ runtime: vi.fn(), config: vi.fn(), session: vi.fn(), admin: vi.fn() }));
vi.mock('./authHttp', async original => ({ ...await original<typeof import('./authHttp')>(), loadAuthRuntime: mocks.runtime, firebasePasswordConfig: mocks.config, resolveRequestSession: mocks.session }));
vi.mock('./hostedCredentialState', async original => ({ ...await original<typeof import('./hostedCredentialState')>(), hostedFirebaseAdmin: mocks.admin }));
import { GET, POST } from '../../app/api/auth/hanzi/email-verification/route';
import { POST as complete } from '../../app/api/auth/hanzi/email-verification/complete/route';
import { readHostedEmailVerification } from './hostedEmailVerification';
const config = { projectId: 'hanzi-fixture', apiKey: 'fixture-key' };
const now = 1_800_000_000_000;
const code = 'CaseSensitive_Email_Action_2026';
let d1: FixtureD1;
const encode = (value: unknown) => bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
const idToken = `${encode({ alg: 'RS256', kid: 'fixture' })}.${encode({ aud: config.projectId, iss: `https://securetoken.google.com/${config.projectId}`,
  sub: 'fixture-uid', exp: now / 1000 + 3600, iat: now / 1000, auth_time: now / 1000, firebase: { sign_in_provider: 'password' } })}.signature`;
const credential = { uid: 'fixture-uid', email: 'owner@example.invalid', emailVerified: false, disabled: false,
  passwordUpdatedAt: now - 10000, validSince: now / 1000 - 10 };
const request = (path = 'email-verification', body: unknown = { password: 'Fixture-password-2026' }, origin: string | null = 'https://hanzi.test') =>
  new Request(`https://hanzi.test/api/auth/hanzi/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
const action = (operation = 'confirm') => request('email-verification/complete', { operation, oobCode: code, uid: 'other-uid', email: 'other@example.invalid', endpoint: 'https://evil.invalid' });
beforeEach(() => {
  vi.resetAllMocks(); vi.spyOn(Date, 'now').mockReturnValue(now);
  d1 = new FixtureD1();
  d1.sql.exec(`INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',1,1),('other','active',1,1);
    INSERT INTO auth_identities(id,user_id,provider,provider_subject,normalized_email,email_verified,created_at,updated_at)
      VALUES('hanzi-owner','owner','hanzi','firebase:hanzi-fixture:fixture-uid','owner@example.invalid',0,1,1),('other-identity','other','google','other-uid','other@example.invalid',1,1,1);
    INSERT INTO hosted_hanzi_aliases VALUES('owner','hanzi-owner','hanzi-fixture','fixture-uid','fixture.owner','owner@example.invalid',1,1);
    INSERT INTO learner_workspace_entries VALUES('owner',0,'reader-position:fixture','{"position":0.5}',1,'stable-outbox-id');`);
  mocks.runtime.mockResolvedValue({ database: d1, repository: {}, environment: { HANZI_HOSTING_PROVIDER: 'cloudflare' } });
  mocks.config.mockReturnValue(config); mocks.session.mockResolvedValue({ userId: 'owner' });
  mocks.admin.mockResolvedValue({ lookup: vi.fn().mockResolvedValue(credential) });
});
afterEach(() => { d1.sql.close(); vi.restoreAllMocks(); });
const untouched = () => {
  expect(d1.sql.prepare('SELECT change_id,value_json FROM learner_workspace_entries').get()).toMatchObject({ change_id: 'stable-outbox-id', value_json: '{"position":0.5}' });
  expect(d1.sql.prepare("SELECT email_verified FROM auth_identities WHERE id='other-identity'").get()?.email_verified).toBe(1);
  expect(d1.sql.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
};
describe('owner-bound HANZI email verification', () => {
  it.each([null, 'https://evil.invalid'])('blocks cross-origin %s before session/provider access', async origin => {
    expect((await POST(request(undefined, undefined, origin))).status).toBe(403);
    expect((await complete(request('email-verification/complete', undefined, origin))).status).toBe(403);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('requires a first-party session and keeps unavailable configuration closed', async () => {
    mocks.session.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
    expect((await GET(new Request(request().url))).status).toBe(401);
    mocks.session.mockResolvedValue({ userId: 'owner' }); mocks.config.mockReturnValue(null);
    expect(await (await GET(new Request(request().url))).json()).toEqual({ available: false });
    expect((await POST(request())).status).toBe(503); expect((await complete(action())).status).toBe(503);
  });
  it('refreshes only the bound alias from live provider state, without moving owner or progress', async () => {
    mocks.admin.mockResolvedValue({ lookup: vi.fn().mockResolvedValue({ ...credential, emailVerified: true }) });
    const response = await GET(new Request(request().url));
    expect(await response.json()).toEqual({ available: true, email: credential.email, verified: true });
    expect(d1.sql.prepare("SELECT email_verified FROM auth_identities WHERE id='hanzi-owner'").get()?.email_verified).toBe(1); untouched();
  });
  it.each([null, { ...credential, uid: 'other-uid' }, { ...credential, email: 'other@example.invalid' }, { ...credential, disabled: true }])('never marks verification from an unsuitable provider account: %j', async reply => {
    await expect(readHostedEmailVerification(d1, 'owner', config.projectId, async () => ({ lookup: async () => reply }))).rejects.toThrow();
    expect(d1.sql.prepare("SELECT email_verified FROM auth_identities WHERE id='hanzi-owner'").get()?.email_verified).toBe(0); untouched();
  });
  it('uses only a fresh password proof for the session owner when sending, ignoring caller email/token', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ idToken }))
      .mockResolvedValueOnce(Response.json({ users: [{ ...credential, localId: credential.uid, validSince: String(credential.validSince), providerUserInfo: [{ providerId: 'password' }] }] }))
      .mockResolvedValueOnce(Response.json({ email: credential.email }));
    const response = await POST(request('email-verification', { password: 'Fixture-password-2026', email: 'victim@example.invalid', idToken: 'forged', continueUrl: 'https://evil.invalid' }));
    expect(await response.json()).toEqual({ accepted: true, verified: false });
    expect(response.headers.get('set-cookie')).toBeNull(); expect(response.headers.get('cache-control')).toContain('no-store');
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).email).toBe(credential.email);
    expect(JSON.parse(fetcher.mock.calls[2]![1]!.body as string)).toEqual({ requestType: 'VERIFY_EMAIL', idToken });
    expect(fetcher.mock.calls[2]![0]).toBe('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=fixture-key'); untouched();
  });
  it('rejects an incorrect password and does not send an email', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, { status: 400 }));
    expect((await POST(request())).status).toBe(401); expect(fetcher).toHaveBeenCalledOnce(); untouched();
  });
  it('caps verification sending independently of sign-in and never persists the password', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, { status: 400 }));
    for (let index = 0; index < 3; index++) expect((await POST(request())).status).toBe(401);
    expect((await POST(request())).status).toBe(429); expect(fetcher).toHaveBeenCalledTimes(3);
    const rows = JSON.stringify(d1.sql.prepare('SELECT * FROM auth_login_rate_limits').all());
    expect(rows).not.toContain('Fixture-password'); expect(rows).not.toContain(credential.email);
  });
  it('verifies the link without consuming, revealing email, or creating a session', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ requestType: 'VERIFY_EMAIL', email: credential.email }));
    const response = await complete(action('verify'));
    expect(await response.json()).toEqual({ valid: true }); expect(response.headers.get('set-cookie')).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(d1.sql.prepare("SELECT email_verified FROM auth_identities WHERE id='hanzi-owner'").get()?.email_verified).toBe(0); untouched();
  });
  it('consumes only a verification code and updates the exact bound identity', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ requestType: 'VERIFY_EMAIL', email: credential.email }))
      .mockResolvedValueOnce(Response.json({ localId: credential.uid, email: credential.email, emailVerified: true }));
    expect(await (await complete(action())).json()).toEqual({ verified: true });
    expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toEqual({ oobCode: code, returnSecureToken: false });
    expect(fetcher.mock.calls[1]![0]).toContain('accounts:update?');
    expect(d1.sql.prepare("SELECT email_verified FROM auth_identities WHERE id='hanzi-owner'").get()?.email_verified).toBe(1); untouched();
  });
  it.each(['PASSWORD_RESET', 'RECOVER_EMAIL'])('refuses action type %s before consuming it', async requestType => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ requestType, email: credential.email }));
    expect((await complete(action())).status).toBe(409); expect(fetcher).toHaveBeenCalledOnce(); untouched();
  });
  it.each(['EXPIRED_OOB_CODE', 'INVALID_OOB_CODE'])('reports used/expired codes %s without provider details', async message => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: { message } }, { status: 400 }));
    const response = await complete(action()); expect(response.status).toBe(409); expect(await response.text()).not.toContain(message);
  });
  it('does not adopt an unmapped identity by email', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ requestType: 'VERIFY_EMAIL', email: 'unknown@example.invalid' }));
    expect((await complete(action())).status).toBe(409); expect(fetcher).toHaveBeenCalledOnce(); untouched();
  });
  it('keeps a wrong UID or uncertain upstream result retryable without marking email verified', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ requestType: 'VERIFY_EMAIL', email: credential.email }))
      .mockResolvedValueOnce(Response.json({ localId: 'other-uid', email: credential.email, emailVerified: true }));
    expect((await complete(action())).status).toBe(503);
    expect(d1.sql.prepare("SELECT email_verified FROM auth_identities WHERE id='hanzi-owner'").get()?.email_verified).toBe(0); untouched();
  });
  it('does not falsely report confirmation when the provider consumes a link but its reply is lost', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ requestType: 'VERIFY_EMAIL', email: credential.email }))
      .mockRejectedValueOnce(new Error('private upstream'));
    const response = await complete(action()); expect(response.status).toBe(503); expect(await response.text()).not.toContain('upstream');
    mocks.admin.mockResolvedValue({ lookup: async () => ({ ...credential, emailVerified: true }) });
    expect(await (await GET(new Request(request().url))).json()).toMatchObject({ verified: true }); untouched();
  });
});
