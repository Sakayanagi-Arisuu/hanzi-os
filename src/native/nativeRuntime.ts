import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { publicOfflineResources } from '../lib/prepareOfflineStudy';

type NativeResponse = { status: number; headers: Record<string, string>; body: string };
interface HanziDeviceBridge {
  request(input: { path: string; method: string; headers: Record<string, string>; body?: string }): Promise<NativeResponse>;
  signIn(input?: { provider: 'google' | 'github' }): Promise<void>;
  hanziSignIn(input: { operation: 'login' | 'register'; credentials: Record<string, string> }): Promise<{ status: number; body: string }>;
  finishSignIn(input: { url: string }): Promise<void>;
  prepareMedia(input: { paths: string[] }): Promise<void>;
  openExternal(input: { path: string }): Promise<void>;
  saveFile(input: { name: string; body: string }): Promise<void>;
}
const device = registerPlugin<HanziDeviceBridge>('HanziDevice');
const google = registerPlugin<{ signIn(): Promise<{ authenticated?: boolean; fallback?: boolean; reason?: string }> }>('HanziGoogle');
const speech = registerPlugin<{ speak(input: { text: string; language: 'zh-CN' | 'vi-VN'; rate: number; volume: number }): Promise<void>; cancel(): Promise<void> }>('HanziSpeech');
export const isNativeApp = () => Capacitor.isNativePlatform();
export const startNativeSignIn = async () => {
  if (!Capacitor.isPluginAvailable('HanziGoogle')) {
    await device.signIn({ provider: 'google' }); return;
  }
  const result = await google.signIn();
  if (result.authenticated) { window.location.replace('/'); return; }
  if (result.fallback && (result.reason === 'not-configured' || result.reason === 'unavailable')) {
    await device.signIn({ provider: 'google' }); return;
  }
  throw new Error('Đăng nhập Google chưa hoàn tất.');
};
export const startNativeGithubSignIn = () => device.signIn({ provider: 'github' });
export const signInNativeHanzi = async (input: { operation: 'login' | 'register'; credentials: Record<string, string> }) => {
  const response = await device.hanziSignIn(input);
  const body = JSON.parse(response.body) as { authenticated?: boolean; returnTo?: string; error?: { message?: string } };
  if (response.status < 200 || response.status >= 300 || body.authenticated !== true) throw new Error(body.error?.message ?? 'Chưa đăng nhập được tài khoản HANZI.OS.');
  return { returnTo: body.returnTo };
};
export const openNativeExternal = (path: string) => device.openExternal({ path });
export const saveNativeJson = (name: string, value: string) => {
  let binary = ''; for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return device.saveFile({ name, body: btoa(binary) });
};
export const speakNative = (text: string, language: 'zh-CN' | 'vi-VN', rate: number, volume: number) => speech.speak({ text, language, rate, volume });
export const cancelNativeSpeech = () => speech.cancel();

export function nativeApiPath(input: RequestInfo | URL, localOrigin: string): string | null {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, localOrigin);
  if (url.origin !== localOrigin || !url.pathname.startsWith('/api/')) return null;
  return url.pathname + url.search;
}

/** Install before mounting any learning provider. Existing owner, reset epoch,
 * idempotency and offlineRead remain unchanged above the transport boundary. */
export function createNativeFetch(send: HanziDeviceBridge['request'], localOrigin: string, fallback: typeof fetch): typeof fetch {
  return async (input, options) => {
    const path = nativeApiPath(input, localOrigin);
    if (!path) return fallback(input, options);
    const request = new Request(input instanceof Request ? input : new URL(path, localOrigin), options);
    const signal = request.signal;
    signal?.throwIfAborted();
    const headers = Object.fromEntries(request.headers.entries());
    const method = request.method;
    const bodyBytes = method === 'GET' || method === 'HEAD' ? undefined
      : new Uint8Array(await request.arrayBuffer());
    let encoded = '';
    if (bodyBytes) for (const byte of bodyBytes) encoded += String.fromCharCode(byte);
    const body = bodyBytes ? btoa(encoded) : undefined;
    const pending = send({ path, method, headers, body });
    const response = await new Promise<NativeResponse>((resolve, reject) => {
      const abort = () => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      pending.then(resolve, reject).finally(() => signal?.removeEventListener('abort', abort));
    });
    signal?.throwIfAborted();
    const bytes = Uint8Array.from(atob(response.body), character => character.charCodeAt(0));
    return new Response([204, 205, 304].includes(response.status) || method === 'HEAD' ? null : bytes,
      { status: response.status, headers: response.headers });
  };
}

export async function prepareNativeStudy(content: unknown) {
  const paths = publicOfflineResources(content).filter(path => path.startsWith('/api/content/media/')
    || /^\/(lessons|reader)\/.*\.(png|jpe?g|webp|avif)$/i.test(path));
  for (let index = 0; index < paths.length; index += 30) {
    await device.prepareMedia({ paths: paths.slice(index, index + 30) });
  }
}

export async function installNativeTransport() {
  if (!isNativeApp()) return;
  window.fetch = createNativeFetch(input => device.request(input), location.origin, window.fetch.bind(window));
  let finishing = false;
  const finish = async (url: string) => {
    if (!url.startsWith('com.regulus.hanzios://auth?')) return;
    if (finishing) return;
    finishing = true;
    try {
      await device.finishSignIn({ url });
      window.location.replace('/');
    } catch { window.location.replace('/signin?error=mobile_exchange'); }
  };
  await App.addListener('appUrlOpen', event => { void finish(event.url); });
  await App.addListener('appStateChange', event => {
    if (event.isActive) {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('hanzi-prepare-offline'));
    }
  });
  await App.addListener('backButton', event => {
    if (event.canGoBack) history.back();
    else if (location.pathname !== '/') window.location.assign('/');
    else void App.exitApp();
  });
  const launch = await App.getLaunchUrl();
  if (launch?.url) await finish(launch.url);
  document.addEventListener('click', event => {
    const anchor = (event.target as Element | null)?.closest('a');
    if (!anchor) return;
    const url = new URL(anchor.href, location.origin);
    const externalPaths = ['/privacy', '/terms', '/voice-data', '/delete-account', '/admin', '/studio', '/account/security'];
    if (url.origin === location.origin && externalPaths.some(path => url.pathname === path || url.pathname.startsWith(path + '/'))) {
      event.preventDefault();
      void device.openExternal({ path: url.pathname + url.search });
    }
    if (url.origin === location.origin && url.pathname === '/signout-with-chatgpt') {
      event.preventDefault(); window.location.assign('/');
    }
  });
}
