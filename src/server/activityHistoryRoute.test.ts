import { beforeEach, expect, it, vi } from 'vitest';
import { deriveAccountKey } from '../lib/accountKey';
import { LearningResetEpochConflictError } from './learningResetEpoch';

const mocks = vi.hoisted(() => ({ identity: vi.fn(), database: vi.fn(), resolve: vi.fn(), read: vi.fn() }));
vi.mock('../../app/chatgpt-auth', () => ({ getChatGPTUser: mocks.identity }));
vi.mock('./d1', () => ({ getD1Database: mocks.database }));
vi.mock('./syncRepository', () => ({ SyncRepository: class { resolveUser = mocks.resolve; } }));
vi.mock('./activityHistoryRepository', () => ({ ActivityHistoryRepository: class { readPage = mocks.read; } }));
import { GET } from '../../app/api/learning/activity-history/route';

beforeEach(() => {
  vi.resetAllMocks(); mocks.identity.mockResolvedValue({ userId: 'one', email: 'one@example.invalid' });
  mocks.database.mockResolvedValue({}); mocks.resolve.mockResolvedValue('user-one');
  mocks.read.mockResolvedValue({ schemaVersion: 1, events: [] });
});
const request = (query = 'resetEpoch=0', owner?: string) => new Request(`https://hanzi.invalid/api/learning/activity-history?${query}`,
  { headers: owner ? { 'x-learning-owner': owner } : {} });

it('derives history scope from auth, blocks switched cookies before database access and returns private no-store', async () => {
  mocks.identity.mockResolvedValueOnce(null);
  expect((await GET(request())).status).toBe(401);
  expect((await GET(request('resetEpoch=0', await deriveAccountKey('other')))).status).toBe(409);
  expect(mocks.database).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  const response = await GET(request('resetEpoch=3&ownerKey=forged&limit=25'));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('private, no-store');
  expect(mocks.read).toHaveBeenCalledWith('user-one', await deriveAccountKey('one'), 3, { limit: 25, cursor: null });
});

it.each(['', 'resetEpoch=bad', 'resetEpoch=-1', 'resetEpoch=0&limit=-1', 'resetEpoch=0&cursor=bad', 'resetEpoch=0&cursor=[]',
  `resetEpoch=0&cursor=${'x'.repeat(1001)}`])('rejects malformed query without reading history: %s', async query => {
  expect((await GET(request(query))).status).toBe(400); expect(mocks.read).not.toHaveBeenCalled();
});

it('returns retryable reset/backend errors rather than claiming an empty successful history', async () => {
  mocks.read.mockRejectedValueOnce(new LearningResetEpochConflictError());
  expect((await GET(request())).status).toBe(409);
  mocks.read.mockRejectedValueOnce(new Error('unreadable source'));
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: { code: 'HISTORY_UNAVAILABLE', retryable: true } });
});
