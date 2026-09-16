import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ identity: vi.fn(), database: vi.fn(), resolve: vi.fn(), limit: vi.fn(), record: vi.fn() }));
vi.mock('../../app/chatgpt-auth', () => ({ getAuthenticatedUser: mocks.identity }));
vi.mock('./d1', () => ({ getD1Database: mocks.database }));
vi.mock('./syncRepository', () => ({ SyncRepository: class { resolveUser = mocks.resolve; } }));
vi.mock('./lessonPageAttemptRepository', async importOriginal => ({
  ...await importOriginal<typeof import('./lessonPageAttemptRepository')>(),
  LessonPageAttemptRepository: class { record = mocks.record; },
}));
vi.mock('./mutationRateLimit', async importOriginal => ({
  ...await importOriginal<typeof import('./mutationRateLimit')>(), consumeMutationRateLimit: mocks.limit,
}));
import { POST } from '../../app/api/learning/page-attempts/route';
import { PageAttemptConflictError } from './lessonPageAttemptRepository';
import { LearningResetEpochConflictError } from './learningResetEpoch';
import { deriveAccountKey } from '../lib/accountKey';
let ownerKey: string;
const command = { version: 1, idempotencyKey: 'key', resetEpoch: 0, lessonId: 'boot-1', activityId: 'activity', activityVersion: 'version', occurredAt: '2026-09-14T10:00:00Z', response: { text: '你好', answerIds: [], usedHint: false, priorFeedback: false, priorReveal: false } };
const receipt = { version: 1, attemptId: 'attempt', idempotencyKey: command.idempotencyKey, resetEpoch: command.resetEpoch, activityId: command.activityId, activityVersion: command.activityVersion, outcome: 'correct', duplicate: false, masteryEligible: false };
const request = (body: unknown = command, headers: Record<string, string> = {}) => new Request('http://localhost/api/learning/page-attempts', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json', 'x-learning-owner': ownerKey, ...headers }, body: JSON.stringify(body) });
beforeEach(async () => {
  vi.clearAllMocks();
  ownerKey = await deriveAccountKey('owner-a');
  mocks.identity.mockResolvedValue({ userId: 'owner-a' }); mocks.database.mockResolvedValue({});
  mocks.resolve.mockResolvedValue('owner-a'); mocks.limit.mockResolvedValue({ allowed: true, limit: 60, remaining: 59, resetAfterSeconds: 30, retryAfterSeconds: 0, policyVersion: '2026-07-22.v1' }); mocks.record.mockResolvedValue(receipt);
});
it('blocks cross-origin requests and unauthenticated writes before accessing storage', async () => {
  expect((await POST(request(command, { origin: 'https://other.example' }))).status).toBe(403);
  expect((await POST(request(command, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
  expect(mocks.identity).not.toHaveBeenCalled();
  mocks.identity.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect(mocks.database).not.toHaveBeenCalled(); expect(mocks.record).not.toHaveBeenCalled();
});
it('rejects injected ownership/score and malformed, empty or oversized requests', async () => {
  for (const body of [{ ...command, userId: 'owner-b' }, { ...command, score: 100 }, { ...command, resetEpoch: -1 }, { ...command, response: { ...command.response, text: '' } }]) {
    expect((await POST(request(body))).status).toBe(422);
  }
  expect((await POST(request(command, { 'content-type': 'text/plain' }))).status).toBe(415);
  expect((await POST(new Request('http://localhost/api/learning/page-attempts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-learning-owner': ownerKey }, body: '{' }))).status).toBe(400);
  expect((await POST(request({ ...command, response: { ...command.response, text: '汉'.repeat(24_000) } }))).status).toBe(413);
  expect(mocks.record).not.toHaveBeenCalled();
});
it('uses authenticated ownership and returns a non-cacheable receipt for writes and retries', async () => {
  const response = await POST(request());
  expect(response.status).toBe(201); expect(await response.json()).toEqual(receipt);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(mocks.record).toHaveBeenCalledWith('owner-a', command);
  mocks.record.mockResolvedValue({ ...receipt, duplicate: true });
  expect((await POST(request())).status).toBe(200);
});
it('preserves explicit conflict and transient retry semantics without leaking internals', async () => {
  for (const error of [new PageAttemptConflictError('private detail'), new LearningResetEpochConflictError()]) {
    mocks.record.mockRejectedValueOnce(error);
    const response = await POST(request()); expect(response.status).toBe(409);
    expect((await response.json()).error.retryable).toBe(false);
  }
  mocks.record.mockRejectedValueOnce(new Error('secret database path'));
  const unavailable = await POST(request()); expect(unavailable.status).toBe(503);
  const text = await unavailable.text(); expect(text).not.toContain('secret'); expect(JSON.parse(text).error.retryable).toBe(true);
});
it('shares the existing attempt rate limit and does not write when throttled', async () => {
  mocks.limit.mockResolvedValue({ allowed: false, retryAfterSeconds: 12, limit: 60, remaining: 0, resetAfterSeconds: 12, policyVersion: '2026-07-22.v1' });
  const response = await POST(request()); expect(response.status).toBe(429);
  expect(response.headers.get('retry-after')).toBe('12');
  expect(mocks.limit).toHaveBeenCalledWith({}, 'owner-a', expect.objectContaining({ scope: 'learning.attempts.write' }));
  expect(mocks.record).not.toHaveBeenCalled();
  expect((await response.json()).error.retryable).toBe(true);
});
it('refuses pending work from another owner or a caller without an owner binding', async () => {
  for (const expectedOwner of ['', await deriveAccountKey('owner-b')]) {
    const response = await POST(request(command, { 'x-learning-owner': expectedOwner }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('PAGE_ATTEMPT_OWNER_CHANGED');
  }
  mocks.identity.mockResolvedValue({ userId: 'owner-b' });
  expect((await POST(request())).status).toBe(409);
  expect(mocks.resolve).not.toHaveBeenCalled(); expect(mocks.record).not.toHaveBeenCalled();
});
