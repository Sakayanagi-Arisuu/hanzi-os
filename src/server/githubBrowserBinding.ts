import { constantTimeEqual } from '../auth/authCrypto';
const name = '__Host-hanzi_github_state';
export function githubStateCookie(state: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/u.test(state)) throw new Error('Invalid OAuth state.');
  return `${name}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}
export const clearGithubStateCookie = () => `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function hasGithubBrowserBinding(request: Request, state: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/u.test(state)) return false;
  const cookies = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`));
  return cookies.length === 1 && constantTimeEqual(cookies[0]!.slice(name.length + 1), state);
}
