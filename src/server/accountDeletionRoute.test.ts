import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FixtureD1 } from './testing/FixtureD1';
import { deriveAccountKey } from '../lib/accountKey';
const mocks = vi.hoisted(() => ({ runtime: vi.fn(), session: vi.fn(), admin: vi.fn() }));
vi.mock('./authHttp', async original => ({ ...await original<typeof import('./authHttp')>(), loadAuthRuntime: mocks.runtime, resolveRequestSession: mocks.session }));
vi.mock('./hostedCredentialState', async original => ({ ...await original<typeof import('./hostedCredentialState')>(), hostedFirebaseAdmin: mocks.admin }));
import { POST } from '../../app/api/account/deletion/route';
let d1: FixtureD1;
const now = 1_800_000_000_000;
const token = 'A'.repeat(43);
let ownerKey: string;
const request = (body: unknown = { confirmation: 'DELETE HANZI.OS', deletionToken: token, ownerKey }, origin: string | null = 'https://hanzi.test') =>
  new Request('https://hanzi.test/api/account/deletion', { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
beforeEach(async () => {
  vi.resetAllMocks(); vi.spyOn(Date, 'now').mockReturnValue(now);
  ownerKey = await deriveAccountKey('owner');
  d1 = new FixtureD1();
  d1.sql.exec(`INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',1,1),('other','active',1,1);
    INSERT INTO user_roles(user_id,role,granted_at,updated_at) VALUES('owner','learner',1,1);
    INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,authenticated_at,created_at,last_seen_at,expires_at)
      VALUES('session','owner','hash','google',${now-1000},${now-1000},${now-1000},${now+10000});`);
  mocks.runtime.mockResolvedValue({ database: d1, repository: {} });
  mocks.session.mockResolvedValue({ userId: 'owner', sessionId: 'session', authenticatedAt: now-1000, displayName: 'Fixture', email: '', fullName: null });
});
afterEach(() => { d1.sql.close(); vi.restoreAllMocks(); });
describe('deletion receipt HTTP ceremony', () => {
  it.each([null, 'https://evil.invalid'])('blocks origin %s before authority or D1 access', async origin => {
    expect((await POST(request(undefined, origin))).status).toBe(403); expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { confirmation: 'wrong', deletionToken: token }, { confirmation: 'DELETE HANZI.OS', deletionToken: 'short' }])('rejects malformed confirmation %j', async body => {
    expect((await POST(request(body))).status).toBe(422); expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('bounds body and requires JSON', async () => {
    expect((await POST(request({ extra: 'x'.repeat(2000) }))).status).toBe(413);
    const input = request(); input.headers.set('content-type','text/plain'); expect((await POST(input)).status).toBe(415);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it.each([null, { userId:'owner',sessionId:'session',authenticatedAt:now-700000,displayName:'Fixture',email:'',fullName:null }])('requires recent first-party authentication on a new intent %j', async session => {
    mocks.session.mockResolvedValue(session); expect((await POST(request())).status).toBe(401);
    expect(d1.sql.prepare('SELECT COUNT(*) AS n FROM account_deletion_jobs').get()?.n).toBe(0);
  });
  it('splits durable intent and finalization into separate Free-compatible invocations, with an owner-bound receipt', async () => {
    d1.queries = 0;
    const begun = await POST(request()); expect(begun.status).toBe(202);
    expect(await begun.json()).toEqual({ deleted: false, pending: true, ownerKey: await deriveAccountKey('owner') });
    expect(d1.queries).toBeLessThanOrEqual(50); expect(begun.headers.get('set-cookie')).toBeNull();
    mocks.session.mockResolvedValue(null); d1.queries = 0;
    const finished = await POST(request()); expect(finished.status).toBe(200);
    expect(await finished.json()).toEqual({ deleted: true, pending: false, ownerKey: await deriveAccountKey('owner') });
    expect(d1.queries).toBeLessThanOrEqual(50);
    expect(finished.headers.get('cache-control')).toContain('no-store');
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='other'").get()?.status).toBe('active');
  });
  it('does not authorize a different receipt after the owner has been frozen', async () => {
    await POST(request()); mocks.session.mockResolvedValue(null);
    expect((await POST(request({ confirmation: 'DELETE HANZI.OS', deletionToken: 'B'.repeat(43), ownerKey }))).status).toBe(401);
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('deletion_pending');
  });
  it('refuses an administrative owner while preserving its full graph', async () => {
    d1.sql.prepare("INSERT INTO user_roles(user_id,role,granted_at,updated_at) VALUES('owner','admin',1,1)").run();
    const response = await POST(request()); expect(response.status).toBe(409);
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('active');
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('never freezes a newly signed-in owner when a previous owner receipt was saved but not delivered', async () => {
    mocks.session.mockResolvedValue({ userId: 'other', sessionId: 'other-session', authenticatedAt: now - 1000, displayName: 'Other', email: '', fullName: null });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(d1.sql.prepare('SELECT COUNT(*) AS n FROM account_deletion_jobs').get()?.n).toBe(0);
    expect(d1.sql.prepare('SELECT id,status FROM users ORDER BY id').all()).toEqual([{id:'other',status:'active'},{id:'owner',status:'active'}]);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('refuses a mismatched owner on an existing intent before running deletion', async () => {
    await POST(request());
    const response = await POST(request({ confirmation: 'DELETE HANZI.OS', deletionToken: token, ownerKey: await deriveAccountKey('other') }));
    expect(response.status).toBe(409);
    expect(d1.sql.prepare('SELECT status FROM account_deletion_jobs').get()?.status).toBe('pending');
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='other'").get()?.status).toBe('active');
  });
});
