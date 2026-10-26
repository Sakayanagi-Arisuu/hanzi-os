import { AUTH_JSON_HEADERS, authError, firebasePasswordConfig, loadAuthRuntime, sameOriginMutation } from '../../../../../src/server/authHttp';
import { consumeAuthPasswordRateLimit } from '../../../../../src/server/authPasswordRateLimit';
import { readBoundedRequestText } from '../../../../../src/server/boundedRequestBody';
import { requestFirebasePasswordReset } from '../../../../../src/server/firebasePasswordIdentity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu khác nguồn đã bị chặn.');
  const input = await readBoundedRequestText(request, 1_024);
  if (!input.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu vượt quá giới hạn.');
  let email: unknown;
  try { email = (JSON.parse(input.text) as { email?: unknown } | null)?.email; }
  catch { return authError(400, 'INVALID_JSON', 'Không thể đọc yêu cầu.'); }
  if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
    return authError(422, 'INVALID_EMAIL', 'Hãy nhập email đã dùng để tạo tài khoản HANZI.OS.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { database, environment } = await loadAuthRuntime();
    const config = environment.HANZI_HOSTING_PROVIDER === 'cloudflare' ? firebasePasswordConfig(environment) : null;
    if (!config) return authError(503, 'PASSWORD_RESET_UNAVAILABLE', 'Khôi phục mật khẩu HANZI.OS đang được chuẩn bị.');
    if (!await consumeAuthPasswordRateLimit(database, request, normalizedEmail, Date.now(), 'reset')) {
      return authError(429, 'AUTH_RATE_LIMITED', 'Bạn đã yêu cầu nhiều lần. Hãy chờ 10 phút rồi thử lại.', { 'retry-after': '600' });
    }
    // Always cross the same provider boundary, without looking up a local alias:
    // neither status/body nor a fast D1 miss reveals registered addresses.
    await requestFirebasePasswordReset(config, normalizedEmail);
    return Response.json({ accepted: true }, { headers: AUTH_JSON_HEADERS });
  } catch {
    return authError(503, 'PASSWORD_RESET_UNAVAILABLE', 'Chưa gửi được yêu cầu. Hãy thử lại sau.');
  }
}
