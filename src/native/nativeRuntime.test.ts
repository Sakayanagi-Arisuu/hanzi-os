import { describe, expect, it, vi } from 'vitest';
import { createNativeFetch, nativeApiPath } from './nativeRuntime';

describe('native API adapter preserves learner protocol semantics', () => {
  const origin = 'https://localhost';
  it('keeps public packaged resources local and never sends foreign URLs through the credential bridge', async () => {
    expect(nativeApiPath('/api/learning/projection?owner=abc', origin)).toBe('/api/learning/projection?owner=abc');
    expect(nativeApiPath('https://evil.example/api/session', origin)).toBeNull();
    expect(nativeApiPath('/hanzi-data/你.json', origin)).toBeNull();
    const send = vi.fn(); const fallback = vi.fn().mockResolvedValue(new Response('local'));
    expect(await (await createNativeFetch(send, origin, fallback)('/fonts/a.woff2')).text()).toBe('local');
    expect(send).not.toHaveBeenCalled();
  });
  it('preserves owner, reset/idempotency headers, exact Unicode body and denial statuses', async () => {
    const payload = JSON.stringify({ answer: '你好', commandId: 'stable-existing-id' });
    const send = vi.fn().mockResolvedValue({ status: 409, headers: { 'content-type': 'application/json' }, body: btoa('{"error":"owner"}') });
    const fetch = createNativeFetch(send, origin, vi.fn());
    const response = await fetch('/api/learning/attempts', { method: 'POST', headers: {
      'content-type': 'application/json', 'x-learning-owner': 'siwc_owner', 'idempotency-key': 'unchanged',
    }, body: payload });
    const input = send.mock.calls[0][0];
    expect(input.path).toBe('/api/learning/attempts');
    expect(input.headers['x-learning-owner']).toBe('siwc_owner');
    expect(input.headers['idempotency-key']).toBe('unchanged');
    expect(new TextDecoder().decode(Uint8Array.from(atob(input.body), character => character.charCodeAt(0)))).toBe(payload);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'owner' });
  });
  it('transfers recordings without UTF-8 corruption and accepts empty signout responses', async () => {
    const bytes = new Uint8Array([0, 255, 128, 17, 200]);
    const send = vi.fn().mockResolvedValue({ status: 204, headers: {}, body: '' });
    const response = await createNativeFetch(send, origin, vi.fn())('/api/pronunciation', { method: 'POST', body: bytes });
    expect(Uint8Array.from(atob(send.mock.calls[0][0].body), character => character.charCodeAt(0))).toEqual(bytes);
    expect(response.status).toBe(204);
  });
  it('preserves exact private avatar bytes, revision and operation across PUT and DELETE', async () => {
    const bytes = new Uint8Array([0, 255, 128, 17, 200]), operation = crypto.randomUUID();
    const send = vi.fn().mockResolvedValue({ status: 200, headers: { 'content-type': 'image/webp' }, body: btoa(String.fromCharCode(...bytes)) });
    const nativeFetch = createNativeFetch(send, origin, vi.fn());
    const headers = { 'content-type': 'image/webp', 'x-learning-owner': 'account:fixture', 'if-match': '"3"', 'x-avatar-operation': operation };
    const response = await nativeFetch('/api/account/avatar', { method: 'PUT', headers, body: bytes });
    expect(send.mock.calls[0][0]).toMatchObject({ path: '/api/account/avatar', method: 'PUT', headers });
    expect(Uint8Array.from(atob(send.mock.calls[0][0].body), character => character.charCodeAt(0))).toEqual(bytes);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    await nativeFetch('/api/account/avatar', { method: 'DELETE', headers });
    expect(send.mock.calls[1][0]).toMatchObject({ method: 'DELETE', headers, body: '' });
  });
  it('abort rejects promptly and does not turn an aborted response into a usable cached read', async () => {
    const controller = new AbortController();
    let finish!: (value: { status: number; headers: Record<string, string>; body: string }) => void;
    const send = vi.fn(() => new Promise<{ status: number; headers: Record<string, string>; body: string }>(resolve => { finish = resolve; }));
    const pending = createNativeFetch(send, origin, vi.fn())('/api/session', { signal: controller.signal });
    await Promise.resolve(); await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    finish({ status: 200, headers: {}, body: btoa('{}') });
  });
  it('preserves the generated multipart boundary for microphone uploads', async () => {
    const form = new FormData(); form.set('audio', new Blob([new Uint8Array([0, 255, 128, 17])], { type: 'audio/wav' }), 'recording.wav');
    const send = vi.fn().mockResolvedValue({ status: 204, headers: {}, body: '' });
    await createNativeFetch(send, origin, vi.fn())('/api/pronunciation', { method: 'POST', body: form });
    const input = send.mock.calls[0][0];
    const body = Uint8Array.from(atob(input.body), character => character.charCodeAt(0));
    const decoded = await new Request('https://test.example/upload', { method: 'POST', headers: input.headers, body }).formData();
    const audio = decoded.get('audio') as File;
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(new Uint8Array([0, 255, 128, 17]));
  });
});
