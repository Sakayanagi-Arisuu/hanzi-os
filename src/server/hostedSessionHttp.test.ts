import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ headers: vi.fn(), getD1Database: vi.fn() }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('./d1', async importOriginal => ({ ...await importOriginal<typeof import('./d1')>(), getD1Database: mocks.getD1Database }));
import { AuthRepository, SESSION_COOKIE_NAME } from './authRepository';
import { FirebaseAuthAdminUnavailableError } from './firebaseAuthAdmin';
import { GET } from '../../app/api/session/route';
import { getAuthenticatedUser } from '../../app/chatgpt-auth';

beforeEach(() => {
  vi.restoreAllMocks(); mocks.getD1Database.mockResolvedValue({});
  mocks.headers.mockResolvedValue(new Headers({ cookie: `${SESSION_COOKIE_NAME}=${'a'.repeat(43)}` }));
});
describe('hosted provider availability at the session HTTP boundary', () => {
  it('preserves an unavailable provider as a retryable error instead of an anonymous session', async () => {
    vi.spyOn(AuthRepository.prototype, 'resolveSession').mockRejectedValue(new FirebaseAuthAdminUnavailableError('private upstream detail'));
    await expect(getAuthenticatedUser()).rejects.toBeInstanceOf(FirebaseAuthAdminUnavailableError);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('retry-after')).toBe('30');
    const body = await response.json();
    expect(body).toMatchObject({ error: { code: 'SESSION_VERIFICATION_UNAVAILABLE', retryable: true } });
    expect(body).not.toHaveProperty('authenticated');
    expect(JSON.stringify(body)).not.toContain('private upstream detail');
  });
  it('does not adopt a different host identity when a native provider is unavailable', async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: `${SESSION_COOKIE_NAME}=${'a'.repeat(43)}`,
      'oai-authenticated-user-email': 'other@example.invalid' }));
    vi.spyOn(AuthRepository.prototype, 'resolveSession').mockRejectedValue(new FirebaseAuthAdminUnavailableError('offline'));
    await expect(getAuthenticatedUser()).rejects.toBeInstanceOf(FirebaseAuthAdminUnavailableError);
  });
  it('preserves a database outage as 503 without clearing the account or exposing SQL diagnostics', async () => {
    vi.spyOn(AuthRepository.prototype, 'resolveSession').mockRejectedValue(new Error('D1 SQL private diagnostic'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
    const body = await response.json();
    expect(body).not.toHaveProperty('authenticated');
    expect(JSON.stringify(body)).not.toContain('SQL');
  });
  it('returns an anonymous session only after the repository proves that the native session is invalid', async () => {
    vi.spyOn(AuthRepository.prototype, 'resolveSession').mockResolvedValue(null);
    expect(await (await GET()).json()).toMatchObject({ authenticated: false, accountKey: null });
  });
});
