import { expect, it } from 'vitest';
import { googleStateCookie, hasGoogleBrowserBinding } from './googleBrowserBinding';

it('rejects callbacks copied from another browser and malformed/duplicate state cookies', () => {
  const state = 'a'.repeat(43);
  const check = (cookie?: string) => hasGoogleBrowserBinding(new Request('https://hanzi.example/auth/google/callback', {
    headers: cookie ? { cookie } : {},
  }), state);
  expect(check()).toBe(false);
  expect(check(googleStateCookie('b'.repeat(43)))).toBe(false);
  expect(check(googleStateCookie(state))).toBe(true);
  expect(check(`${googleStateCookie(state)}; __Host-hanzi_google_state=${state}`)).toBe(false);
  expect(() => googleStateCookie('bad; injected=true')).toThrow();
});
