import { describe, expect, it } from 'vitest';
import { hanziEmailActionFromUrl, passwordResetCodeFromUrl } from './passwordResetAction';
const code = 'CaseSensitive_Action_1234567890';
describe('password reset action URL boundary', () => {
  it('keeps verification codes distinct from password-reset codes', () => {
    const url = new URL(`https://hanzi.test/auth/hanzi/action?mode=verifyEmail&oobCode=${code}`);
    expect(hanziEmailActionFromUrl(url)).toEqual({ mode: 'verifyEmail', code });
    expect(passwordResetCodeFromUrl(url)).toBeNull();
  });
  it('reads only the supported action and ignores caller-controlled destinations and keys', () => {
    expect(passwordResetCodeFromUrl(new URL(`https://hanzi.test/auth/hanzi/action?mode=resetPassword&oobCode=${code}&apiKey=untrusted&continueUrl=https://evil.invalid`))).toBe(code);
  });
  it.each(['', '?mode=verifyEmail&oobCode=' + code, '?mode=resetPassword&oobCode=short',
    '?mode=resetPassword&mode=verifyEmail&oobCode=' + code,
    '?mode=resetPassword&oobCode=' + code + '&oobCode=' + code,
    '?mode=resetPassword&oobCode=%20' + code])('rejects missing, duplicate or invalid action: %s', query => {
    expect(passwordResetCodeFromUrl(new URL(`https://hanzi.test/auth/hanzi/action${query}`))).toBeNull();
  });
});
