import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ runtime: vi.fn(), config: vi.fn(), rate: vi.fn() }));
vi.mock('./authHttp', async original => ({ ...await original<typeof import('./authHttp')>(), loadAuthRuntime: mocks.runtime, firebasePasswordConfig: mocks.config }));
vi.mock('./authPasswordRateLimit', () => ({ consumeAuthPasswordRateLimit: mocks.rate }));
import { POST } from '../../app/api/auth/hanzi/password-reset/complete/route';

const code = 'CaseSensitive_Action_1234567890';
const password = 'Safe-password-2026';
const providerReply = { email: 'owner@example.invalid', requestType: 'PASSWORD_RESET' };
function request(body: unknown = { operation: 'verify', oobCode: code }, origin: string | null = 'https://hanzi.test') {
  return new Request('https://hanzi.test/api/auth/hanzi/password-reset/complete', { method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
}
const confirm = () => request({ operation: 'confirm', oobCode: code, newPassword: password,
  email: 'victim@example.invalid', apiKey: 'evil-key', endpoint: 'https://evil.invalid', continueUrl: 'https://evil.invalid' });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.runtime.mockResolvedValue({ database: {}, environment: { HANZI_HOSTING_PROVIDER: 'cloudflare' } });
  mocks.config.mockReturnValue({ projectId: 'fixture-project', apiKey: 'fixture-key' }); mocks.rate.mockResolvedValue(true);
});

describe('password reset verification and one-time confirmation boundary', () => {
  it.each([null, 'https://evil.invalid'])('blocks origin %s before runtime access', async origin => {
    expect((await POST(request(undefined, origin))).status).toBe(403); expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { operation: 'delete', oobCode: code }, { operation: 'verify', oobCode: 'short' }, { operation: 'verify', oobCode: ' ' + code }])('rejects invalid actions %j', async body => {
    expect((await POST(request(body))).status).toBe(422); expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('bounds JSON and rejects unsupported content types or malformed JSON', async () => {
    expect((await POST(request({ operation: 'verify', oobCode: 'a'.repeat(4000) }))).status).toBe(413);
    const nonJson = request(); nonJson.headers.set('content-type', 'text/plain');
    expect((await POST(nonJson)).status).toBe(415);
    expect((await POST(new Request(request().url, { method: 'POST', headers: request().headers, body: '{' }))).status).toBe(400);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it.each(['short1', 'abcdefghijkl', '123456789012', 'a1'.repeat(65), '汉'.repeat(86) + '1', undefined])('rejects password policy violations before any provider call: %s', async newPassword => {
    expect((await POST(request({ operation: 'confirm', oobCode: code, newPassword }))).status).toBe(422);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });
  it('keeps the provider closed when lifecycle configuration is not ready', async () => {
    mocks.config.mockReturnValue(null);
    expect((await POST(confirm())).status).toBe(503); expect(mocks.rate).not.toHaveBeenCalled();
  });
  it('verifies without returning email, tokens or sessions', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(providerReply));
    const result = await POST(request());
    expect(await result.json()).toEqual({ valid: true });
    expect(result.headers.get('cache-control')).toContain('no-store'); expect(result.headers.get('set-cookie')).toBeNull();
    expect(mocks.rate).toHaveBeenCalledWith({}, expect.any(Request), code, expect.any(Number), 'reset-action');
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({ oobCode: code });
  });
  it('confirms only after a fresh action-type check, uses fixed endpoints and ignores client identity/destinations', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(providerReply));
    const result = await POST(confirm());
    expect(await result.json()).toEqual({ completed: true }); expect(result.headers.get('set-cookie')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(Array(2).fill('https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=fixture-key'));
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({ oobCode: code });
    expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toEqual({ oobCode: code, newPassword: password });
    expect(fetcher.mock.calls[1]![1]!.redirect).toBe('manual');
  });
  it.each(['EXPIRED_OOB_CODE', 'INVALID_OOB_CODE', 'EMAIL_NOT_FOUND', 'USER_DISABLED'])('handles unavailable action %s without leaking provider diagnostics', async message => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: { message } }, { status: 400 }));
    const response = await POST(confirm()); expect(response.status).toBe(409); expect(await response.text()).not.toContain(message);
  });
  it('does not mutate through a verification link', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ...providerReply, requestType: 'VERIFY_EMAIL' }));
    expect((await POST(confirm())).status).toBe(409); expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([{}, { requestType: 'PASSWORD_RESET' }, { ...providerReply, email: 'invalid' }])('keeps malformed success replies retryable and never mutates: %j', async reply => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(reply));
    expect((await POST(confirm())).status).toBe(503); expect(fetcher).toHaveBeenCalledOnce();
  });
  it('allows only one confirmation even when verification was valid twice', async () => {
    let consumed = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      const body = JSON.parse(options!.body as string);
      if (consumed) return Response.json({ error: { message: 'INVALID_OOB_CODE' } }, { status: 400 });
      if (body.newPassword) consumed = true;
      return Response.json(providerReply);
    });
    expect((await POST(request())).status).toBe(200);
    expect((await POST(confirm())).status).toBe(200);
    expect((await POST(confirm())).status).toBe(409);
  });
  it('does not report success on a lost mutation reply and detects consumption on retry', async () => {
    let consumed = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      if (consumed) return Response.json({ error: { message: 'INVALID_OOB_CODE' } }, { status: 400 });
      if (JSON.parse(options!.body as string).newPassword) { consumed = true; throw new Error('private upstream details'); }
      return Response.json(providerReply);
    });
    const uncertain = await POST(confirm()); expect(uncertain.status).toBe(503);
    expect(await uncertain.text()).not.toContain('upstream');
    expect((await POST(confirm())).status).toBe(409);
  });
  it('handles provider policy and infrastructure failures distinctly', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json(providerReply))
      .mockResolvedValueOnce(Response.json({ error: { message: 'WEAK_PASSWORD : private diagnostic' } }, { status: 400 }));
    const weak = await POST(confirm()); expect(weak.status).toBe(422); expect(await weak.text()).not.toContain('diagnostic');
    fetcher.mockResolvedValue(Response.json({ error: { message: 'PERMISSION_DENIED' } }, { status: 400 }));
    const outage = await POST(request()); expect(outage.status).toBe(503); expect(await outage.text()).not.toContain('PERMISSION_DENIED');
  });
  it('fails closed on rate-limit or provider redirect without consuming the action', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    mocks.rate.mockResolvedValue(false); expect((await POST(confirm())).status).toBe(429); expect(fetcher).not.toHaveBeenCalled();
    mocks.rate.mockRejectedValue(new Error('private SQL')); expect((await POST(confirm())).status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
    mocks.rate.mockResolvedValue(true); fetcher.mockResolvedValue(new Response(null, { status: 307, headers: { location: 'https://evil.invalid' } }));
    expect((await POST(confirm())).status).toBe(503); expect(fetcher).toHaveBeenCalledOnce();
  });
});
