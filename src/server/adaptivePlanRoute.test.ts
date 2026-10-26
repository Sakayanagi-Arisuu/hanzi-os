import { beforeEach, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ identity: null as null | { userId: string; email: string } }));
vi.mock('../../app/chatgpt-auth', () => ({ getAuthenticatedUser: async () => auth.identity }));
vi.mock('./d1', async importOriginal => ({ ...await importOriginal<typeof import('./d1')>(),
  getD1Database: vi.fn(() => { throw new Error('Database must not be reached'); }) }));
import { POST } from '../../app/api/learning/adaptive-plan/route';
import { GET as GET_UNIT } from '../../app/api/learning/adaptive-unit/route';
import { deriveAccountKey } from '../lib/accountKey';
import { getD1Database } from './d1';

const url = 'http://localhost/api/learning/adaptive-plan';
beforeEach(() => { auth.identity = null; vi.mocked(getD1Database).mockClear(); });
it('rejects cross-origin requests before reading identity or storage', async () => {
  expect((await POST(new Request(url, { method: 'POST', headers: { origin: 'https://untrusted.example' } }))).status).toBe(403);
  expect(getD1Database).not.toHaveBeenCalled();
});
it('requires authentication and exact owner before any planning', async () => {
  expect((await POST(new Request(url, { method: 'POST' }))).status).toBe(401);
  auth.identity = { userId: 'synthetic-user', email: 'synthetic@example.test' };
  expect((await POST(new Request(url, { method: 'POST', headers: { 'x-learning-owner': 'account:forged' } }))).status).toBe(409);
  expect(getD1Database).not.toHaveBeenCalled();
});
it('rejects client eligibility/payload flags before opening the database', async () => {
  auth.identity = { userId: 'synthetic-user', email: 'synthetic@example.test' };
  const response = await POST(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json',
    'x-learning-owner': await deriveAccountKey(auth.identity.userId) }, body: JSON.stringify({ resetEpoch: 0,
      preferences: null, context: { online: true }, intent: { kind: 'produce', origin: 'manual' }, eligibility: { sourcePermitted: true } }) }));
  expect(response.status).toBe(400); expect(getD1Database).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toContain('no-store');
});

it('does not materialize a unit for cross-site, guest, wrong owner or malformed requests', async () => {
  const unitUrl = 'http://localhost/api/learning/adaptive-unit';
  expect((await GET_UNIT(new Request(unitUrl, { headers: { 'sec-fetch-site': 'cross-site' } }))).status).toBe(403);
  expect((await GET_UNIT(new Request(unitUrl))).status).toBe(401);
  auth.identity = { userId: 'synthetic-user', email: 'synthetic@example.test' };
  expect((await GET_UNIT(new Request(unitUrl, { headers: { 'x-learning-owner': 'wrong-owner' } }))).status).toBe(409);
  expect((await GET_UNIT(new Request(unitUrl, { headers: { 'x-learning-owner': await deriveAccountKey(auth.identity.userId) } }))).status).toBe(400);
  expect(getD1Database).not.toHaveBeenCalled();
});

it('rejects unsupported or duplicate practice mode before opening storage', async () => {
  auth.identity = { userId: 'synthetic-user', email: 'synthetic@example.test' };
  for (const query of ['?mode=practice&mode=practice', '?mode=auto', '?unlocked=true']) {
    const response = await POST(new Request(url + query, { method: 'POST', headers: { 'content-type': 'application/json',
      'x-learning-owner': await deriveAccountKey(auth.identity.userId) }, body: JSON.stringify({ resetEpoch: 0,
        preferences: null, context: { online: true }, intent: { kind: 'produce', origin: 'manual' } }) }));
    expect(response.status).toBe(400);
  }
  expect(getD1Database).not.toHaveBeenCalled();
});
