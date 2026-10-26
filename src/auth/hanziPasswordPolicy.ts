/** Shared by registration and recovery; preserve the password exactly as entered. */
export const HANZI_PASSWORD_MIN_LENGTH = 8;
export const HANZI_PASSWORD_POLICY_MESSAGE = 'Mật khẩu phải có 8–128 ký tự, có chữ thường a–z và số 0–9.';

export function hanziPasswordMeetsPolicy(password: string): boolean {
  const length = [...password].length;
  return length >= HANZI_PASSWORD_MIN_LENGTH && length <= 128
    && new TextEncoder().encode(password).byteLength <= 256
    && /[a-z]/u.test(password) && /[0-9]/u.test(password);
}
