import { constantTimeEqual } from '../auth/authCrypto';

const cookieName = '__Host-hanzi_google_state';
export function googleStateCookie(state: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(state)) throw new Error('Invalid OAuth state');
  return `${cookieName}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}
export const clearGoogleStateCookie = () => `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Server-side state alone does not bind an OAuth callback to the browser that started it. */
export function hasGoogleBrowserBinding(request: Request, state: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(state)) return false;
  const values = (request.headers.get('cookie') ?? '').split(';')
    .map(value => value.trim()).filter(value => value.startsWith(`${cookieName}=`));
  if (values.length !== 1) return false;
  return constantTimeEqual(values[0]!.slice(cookieName.length + 1), state);
}
