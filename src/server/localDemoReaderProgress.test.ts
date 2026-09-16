import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), first: vi.fn(), epoch: vi.fn() }));
vi.mock('../../app/chatgpt-auth', () => ({ getChatGPTUser: mocks.user }));
vi.mock('./d1', () => ({ getD1Database: async () => ({ prepare: () => ({ bind: () => ({ first: mocks.first }) }) }) }));
vi.mock('./learningResetEpoch', () => ({ readCurrentLearningResetEpoch: mocks.epoch }));
import { GET } from '../../app/api/local-demo/reader-progress/route';

describe('local reader fixture access', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.user.mockResolvedValue({ userId: 'local-demo-user-1' });
    mocks.epoch.mockResolvedValue(0);
    mocks.first.mockResolvedValue({ metadata_json: JSON.stringify({ readerProgress: { resetEpoch: 0, chapters: {} } }) });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it('is absent in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect((await GET()).status).toBe(404);
    expect(mocks.user).not.toHaveBeenCalled();
  });
  it.each([null, { userId: 'local-demo-user-2' }, { userId: 'real-user' }])('never exposes another account fixture to %j', async user => {
    mocks.user.mockResolvedValue(user);
    expect((await GET()).status).toBe(404);
    expect(mocks.first).not.toHaveBeenCalled();
  });
  it('does not restore data after an account reset', async () => {
    mocks.epoch.mockResolvedValue(1);
    expect((await GET()).status).toBe(404);
  });
  it('serves only the current demo scope with no caching', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ readerProgress: { resetEpoch: 0, chapters: {} } });
  });
});
