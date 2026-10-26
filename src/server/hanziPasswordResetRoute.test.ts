import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ runtime: vi.fn(), config: vi.fn(), rate: vi.fn() }));
vi.mock('./authHttp', async original => ({ ...await original<typeof import('./authHttp')>(),
  loadAuthRuntime: mocks.runtime, firebasePasswordConfig: mocks.config }));
vi.mock('./authPasswordRateLimit', () => ({ consumeAuthPasswordRateLimit: mocks.rate }));
import { POST } from '../../app/api/auth/hanzi/password-reset/route';

const config = { projectId: 'fixture-project', apiKey: 'fixture-key' };
const request = (body: unknown = { email: 'Owner@example.invalid' }, origin: string | null = 'https://hanzi.test') => new Request('https://hanzi.test/api/auth/hanzi/password-reset', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runtime.mockResolvedValue({ database: {}, environment: { HANZI_HOSTING_PROVIDER: 'cloudflare' } });
  mocks.config.mockReturnValue(config); mocks.rate.mockResolvedValue(true);
});

describe('HANZI password recovery public boundary', () => {
  it.each([null, 'https://evil.invalid'])('blocks origin %s before runtime or email dispatch', async origin => {
    expect((await POST(request(undefined, origin))).status).toBe(403);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { email: 'wrong' }, { email: 5 }, { email: `${'a'.repeat(255)}@example.invalid` }])('rejects invalid body %j', async body => {
    expect((await POST(request(body))).status).toBe(422);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('bounds the payload before parsing or provider access', async () => {
    expect((await POST(request({ email: 'a'.repeat(2_000) }))).status).toBe(413);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON', async () => {
    const input = new Request(request().url, { method: 'POST', headers: { origin: 'https://hanzi.test' }, body: '{' });
    expect((await POST(input)).status).toBe(400);
  });
  it('does not open recovery while hosted HANZI is disabled', async () => {
    mocks.config.mockReturnValue(null);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.rate).not.toHaveBeenCalled();
  });
  it.each([{}, { error: { message: 'EMAIL_NOT_FOUND' } }, { error: { message: 'USER_DISABLED' } }])('returns the same no-store acknowledgement for provider result %j', async payload => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(payload, { status: 'error' in payload ? 400 : 200 }));
    const response = await POST(request({ email: ' OWNER@example.invalid ', continueUrl: 'https://evil.invalid', returnOobLink: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.rate).toHaveBeenCalledWith({}, expect.any(Request), 'owner@example.invalid', expect.any(Number), 'reset');
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=fixture-key');
    expect(options?.redirect).toBe('manual');
    expect(JSON.parse(options?.body as string)).toEqual({ requestType: 'PASSWORD_RESET', email: 'owner@example.invalid' });
  });
  it('rate limits before dispatch without changing login sessions', async () => {
    mocks.rate.mockResolvedValue(false);
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const response = await POST(request());
    expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('600');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([429, 500, 307])('does not report success on upstream status %s', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ private: 'diagnostic' }, { status }));
    const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('diagnostic');
  });
  it('fails closed on D1 rate-limit outage', async () => {
    mocks.rate.mockRejectedValue(new Error('private SQL'));
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('SQL');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not disguise an unknown provider rejection as a sent email', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: { message: 'PERMISSION_DENIED' } }, { status: 400 }));
    const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('PERMISSION_DENIED');
  });
});
