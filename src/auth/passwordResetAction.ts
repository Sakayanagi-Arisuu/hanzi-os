/** Firebase action codes are opaque and case-sensitive. Never persist them. */
export function validPasswordResetCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,1024}$/u.test(value);
}

export function passwordResetCodeFromUrl(url: URL): string | null {
  const modes = url.searchParams.getAll('mode');
  const codes = url.searchParams.getAll('oobCode');
  return modes.length === 1 && modes[0] === 'resetPassword' && codes.length === 1
    && validPasswordResetCode(codes[0]) ? codes[0] : null;
}

export function hanziEmailActionFromUrl(url: URL): { mode: 'resetPassword' | 'verifyEmail'; code: string } | null {
  const modes = url.searchParams.getAll('mode');
  const codes = url.searchParams.getAll('oobCode');
  if (modes.length !== 1 || codes.length !== 1 || !validPasswordResetCode(codes[0])) return null;
  const mode = modes[0];
  return mode === 'resetPassword' || mode === 'verifyEmail' ? { mode, code: codes[0] } : null;
}
