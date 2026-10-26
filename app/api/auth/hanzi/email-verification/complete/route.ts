import { validPasswordResetCode } from '../../../../../../src/auth/passwordResetAction';
import { AUTH_JSON_HEADERS, authError, firebasePasswordConfig, loadAuthRuntime, sameOriginMutation } from '../../../../../../src/server/authHttp';
import { consumeAuthPasswordRateLimit } from '../../../../../../src/server/authPasswordRateLimit';
import { readBoundedRequestText } from '../../../../../../src/server/boundedRequestBody';
import { FirebaseEmailActionInvalidError } from '../../../../../../src/server/firebasePasswordIdentity';
import { processHostedEmailAction } from '../../../../../../src/server/hostedEmailVerification';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu khác nguồn đã bị chặn.');
  const input = await readBoundedRequestText(request, 2_048);
  if (!input.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu vượt quá giới hạn.');
  let body: { operation?: unknown; oobCode?: unknown } | null;
  try { body = JSON.parse(input.text); }
  catch { return authError(400, 'INVALID_JSON', 'Không thể đọc yêu cầu.'); }
  if (!body || !validPasswordResetCode(body.oobCode) || (body.operation !== 'verify' && body.operation !== 'confirm')) {
    return authError(422, 'INVALID_EMAIL_ACTION', 'Liên kết xác minh không hợp lệ. Hãy yêu cầu liên kết mới.');
  }
  try {
    const { database, environment } = await loadAuthRuntime();
    const config = environment.HANZI_HOSTING_PROVIDER === 'cloudflare' ? firebasePasswordConfig(environment) : null;
    if (!config) return authError(503, 'EMAIL_VERIFICATION_UNAVAILABLE', 'Xác minh email đang được chuẩn bị.');
    if (!await consumeAuthPasswordRateLimit(database, request, body.oobCode, Date.now(), 'email-action')) {
      return authError(429, 'AUTH_RATE_LIMITED', 'Bạn đã thử nhiều lần. Hãy chờ 10 phút rồi thử lại.', { 'retry-after': '600' });
    }
    return Response.json(await processHostedEmailAction(database, config, body.oobCode, body.operation === 'confirm'), { headers: AUTH_JSON_HEADERS });
  } catch (error) {
    if (error instanceof FirebaseEmailActionInvalidError) return authError(409, 'EMAIL_LINK_INVALID', 'Liên kết đã hết hạn hoặc đã dùng. Hãy kiểm tra email trong Bảo mật tài khoản.');
    return authError(503, 'EMAIL_VERIFICATION_UNAVAILABLE', 'Chưa xác nhận được kết quả. Hãy đăng nhập và kiểm tra lại trong Bảo mật tài khoản.');
  }
}
