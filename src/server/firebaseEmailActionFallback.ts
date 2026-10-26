import { validPasswordResetCode } from '../auth/passwordResetAction';

/** Firebase's custom action URL applies to every email template. Preserve the
 * provider-hosted recovery flows HANZI does not expose, using only server config. */
export function firebaseEmailActionFallback(request: Request, config: { FIREBASE_PROJECT_ID?: string; FIREBASE_WEB_API_KEY?: string }): Response | null {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.replace(/\/+$/u, '') !== '/auth/hanzi/action') return null;
  const modes = url.searchParams.getAll('mode'), codes = url.searchParams.getAll('oobCode');
  if (modes.length !== 1 || codes.length !== 1 || !validPasswordResetCode(codes[0])
    || !['recoverEmail', 'verifyAndChangeEmail', 'revertSecondFactorAddition'].includes(modes[0]!)) return null;
  const project = config.FIREBASE_PROJECT_ID, key = config.FIREBASE_WEB_API_KEY;
  const headers = { 'cache-control': 'private, no-store, max-age=0', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow' };
  if (!project || !/^[a-z][a-z0-9-]{4,62}$/u.test(project) || !key || !/^[A-Za-z0-9_-]{20,100}$/u.test(key)) {
    return new Response('Chưa mở được liên kết khôi phục. Hãy thử lại sau hoặc liên hệ hỗ trợ.', {status:503,headers});
  }
  const destination = new URL(`https://${project}.firebaseapp.com/__/auth/action`);
  destination.searchParams.set('mode', modes[0]!); destination.searchParams.set('oobCode', codes[0]!);
  destination.searchParams.set('apiKey', key); destination.searchParams.set('lang', 'vi');
  return new Response(null, {status:303,headers:{...headers,location:destination.href}});
}
