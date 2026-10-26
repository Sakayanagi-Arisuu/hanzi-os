import { beforeAll, describe, expect, it, vi } from 'vitest';
import { base64UrlToBytes, toArrayBuffer } from '../auth/authCrypto';
import { FirebaseAuthAdmin, firebaseAuthAdminConfig, type FirebaseAuthAdminConfig } from './firebaseAuthAdmin';

const projectId = 'hanzi-fixture';
const now = 1791892800000;
let config: FirebaseAuthAdminConfig;
let publicKey: CryptoKey;
const tokenReply = () => Response.json({ access_token: 'test-only-access-token', token_type: 'Bearer', expires_in: 3600 });
const accountReply = () => Response.json({ users: [{ localId: 'fixture-uid', email: 'Learner@Example.invalid',
  emailVerified: true, passwordUpdatedAt: now - 10000, validSince: String(now / 1000 - 10), providerUserInfo: [{ providerId: 'password' }] }] });
beforeAll(async () => {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  publicKey = keys.publicKey;
  const encoded = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey))));
  config = { projectId, clientEmail: `hanzi-auth@${projectId}.iam.gserviceaccount.com`,
    privateKeyId: 'a'.repeat(40), privateKey: `-----BEGIN PRIVATE KEY-----\n${encoded}\n-----END PRIVATE KEY-----\n` };
});
const jsonConfig = (overrides = {}) => JSON.stringify({ type: 'service_account', project_id: config.projectId,
  client_email: config.clientEmail, private_key: config.privateKey, private_key_id: config.privateKeyId,
  token_uri: 'https://oauth2.googleapis.com/token', ...overrides });
function setup(replies: Response[]) {
  const fetcher = vi.fn<typeof fetch>(async () => replies.shift()!);
  return { fetcher, admin: new FirebaseAuthAdmin(config, fetcher, () => now) };
}

describe('Firebase project-bound administration', () => {
  it('reads the official service-account shape while refusing a supplied endpoint or different project', () => {
    expect(firebaseAuthAdminConfig(projectId, jsonConfig())).toEqual(config);
    for (const invalid of [undefined, '', '{', jsonConfig({ project_id: 'other-project' }),
      jsonConfig({ token_uri: 'https://evil.invalid/token' }), jsonConfig({ client_email: 'attacker@other-project.iam.gserviceaccount.com' }),
      jsonConfig({ type: 'authorized_user' }), jsonConfig({ private_key: 'missing key' }), jsonConfig({ private_key_id: '../key' })]) {
      expect(firebaseAuthAdminConfig(projectId, invalid)).toBeNull();
    }
  });
  it('uses a verifiable RS256 assertion with only the identitytoolkit scope and fixed Google audience', async () => {
    const { admin, fetcher } = setup([tokenReply(), accountReply()]);
    expect(await admin.lookup('fixture-uid')).toMatchObject({ uid: 'fixture-uid', email: 'learner@example.invalid', validSince: now / 1000 - 10 });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init?.redirect).toBe('manual');
    const params = init?.body as URLSearchParams;
    expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const assertion = params.get('assertion')!;
    const [header, claims, signature] = assertion.split('.');
    expect(JSON.parse(new TextDecoder().decode(base64UrlToBytes(header!)))).toMatchObject({ alg: 'RS256', kid: config.privateKeyId });
    expect(JSON.parse(new TextDecoder().decode(base64UrlToBytes(claims!)))).toEqual({ iss: config.clientEmail,
      aud: 'https://oauth2.googleapis.com/token', scope: 'https://www.googleapis.com/auth/identitytoolkit', iat: now / 1000, exp: now / 1000 + 3600 });
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, toArrayBuffer(base64UrlToBytes(signature!)), new TextEncoder().encode(`${header}.${claims}`))).toBe(true);
    expect(fetcher.mock.calls[1]?.[0]).toBe(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`);
    expect(JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string)).toEqual({ localId: ['fixture-uid'] });
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({ authorization: 'Bearer test-only-access-token' });
  });
  it('reuses only the short-lived server token and sends one exact UID for deletion', async () => {
    const { admin, fetcher } = setup([tokenReply(), accountReply(), Response.json({})]);
    await admin.lookup('fixture-uid');
    await admin.delete('fixture-uid');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]?.[0]).toBe(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`);
    expect(JSON.parse(fetcher.mock.calls[2]?.[1]?.body as string)).toEqual({ localId: 'fixture-uid' });
  });
  it('renews an expiring access token before another operation', async () => {
    let clock = now;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(tokenReply()).mockResolvedValueOnce(accountReply())
      .mockResolvedValueOnce(tokenReply()).mockResolvedValueOnce(accountReply());
    const admin = new FirebaseAuthAdmin(config, fetcher, () => clock);
    await admin.lookup('fixture-uid'); clock += 3541000; await admin.lookup('fixture-uid');
    expect(fetcher.mock.calls.filter(([url]) => url === 'https://oauth2.googleapis.com/token')).toHaveLength(2);
  });
  it.each(['../users', 'uid?project=other', '', 'u'.repeat(129)])('rejects unsafe UIDs before signing or fetching (%s)', async uid => {
    const { admin, fetcher } = setup([]);
    await expect(admin.lookup(uid)).rejects.toThrow('Account administration unavailable.');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('treats an absent Firebase credential as absent, without adopting another account', async () => {
    const { admin } = setup([tokenReply(), Response.json({ users: [] })]);
    expect(await admin.lookup('fixture-uid')).toBeNull();
  });
  it('allows a deletion retry only for the fixed USER_NOT_FOUND response', async () => {
    const { admin } = setup([tokenReply(), Response.json({ error: { message: 'USER_NOT_FOUND' } }, { status: 400 })]);
    await expect(admin.delete('fixture-uid')).resolves.toBeUndefined();
  });
  it.each([Response.json({ error: { message: 'USER_NOT_FOUND' } }, { status: 403 }),
    Response.json({ error: { message: 'PERMISSION_DENIED private detail' } }, { status: 400 }),
    new Response('private provider detail', { status: 503 })])('fails closed on an uncertain delete and omits raw provider details', async response => {
    const { admin } = setup([tokenReply(), response]);
    await expect(admin.delete('fixture-uid')).rejects.toThrow('Account administration unavailable.');
  });
  it.each([tokenReply, accountReply])('refuses redirects instead of forwarding an assertion or access token', async reply => {
    const { admin, fetcher } = setup(reply === tokenReply
      ? [new Response(null, { status: 307, headers: { location: 'https://evil.invalid' } })]
      : [tokenReply(), new Response(null, { status: 307, headers: { location: 'https://evil.invalid' } })]);
    await expect(admin.lookup('fixture-uid')).rejects.toThrow('Account administration unavailable.');
    expect(fetcher).toHaveBeenCalledTimes(reply === tokenReply ? 1 : 2);
    for (const [, init] of fetcher.mock.calls) expect(init?.redirect).toBe('manual');
  });
  it.each([{ localId: 'other-uid' }, { passwordUpdatedAt: '123' }, { validSince: 'NaN' }, { providerUserInfo: [] }, { email: 'invalid' }])(
    'refuses malformed or mismatched identity state (%j)', async override => {
      const account = (await accountReply().json()).users[0];
      const { admin } = setup([tokenReply(), Response.json({ users: [{ ...account, ...override }] })]);
      await expect(admin.lookup('fixture-uid')).rejects.toThrow('Account administration unavailable.');
    },
  );
});
