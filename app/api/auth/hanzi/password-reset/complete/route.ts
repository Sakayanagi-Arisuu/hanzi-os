import { hanziPasswordMeetsPolicy, HANZI_PASSWORD_POLICY_MESSAGE } from '../../../../../../src/auth/hanziPasswordPolicy';
import { validPasswordResetCode } from '../../../../../../src/auth/passwordResetAction';
import { AUTH_JSON_HEADERS, authError, firebasePasswordConfig, loadAuthRuntime, sameOriginMutation } from '../../../../../../src/server/authHttp';
import { consumeAuthPasswordRateLimit } from '../../../../../../src/server/authPasswordRateLimit';
import { readBoundedRequestText } from '../../../../../../src/server/boundedRequestBody';
import { confirmFirebasePasswordReset, FirebasePasswordActionInvalidError, FirebasePasswordPolicyError, verifyFirebasePasswordReset } from '../../../../../../src/server/firebasePasswordIdentity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu khác nguồn đã bị chặn.');
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    return authError(415, 'INVALID_CONTENT_TYPE', 'Không thể đọc yêu cầu.');
  }
  const input = await readBoundedRequestText(request, 3_072);
  if (!input.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu vượt quá giới hạn.');
  let body: { operation?: unknown; oobCode?: unknown; newPassword?: unknown } | null;
  try { body = JSON.parse(input.text); }
  catch { return authError(400, 'INVALID_JSON', 'Không thể đọc yêu cầu.'); }
  if (!body || !validPasswordResetCode(body.oobCode) || (body.operation !== 'verify' && body.operation !== 'confirm')) {
    return authError(422, 'INVALID_RESET_ACTION', 'Liên kết khôi phục không hợp lệ. Hãy yêu cầu liên kết mới.');
  }
  if (body.operation === 'confirm' && (typeof body.newPassword !== 'string' || !hanziPasswordMeetsPolicy(body.newPassword))) {
    return authError(422, 'PASSWORD_POLICY', HANZI_PASSWORD_POLICY_MESSAGE);
  }
  try {
    const { database, environment } = await loadAuthRuntime();
    const config = environment.HANZI_HOSTING_PROVIDER === 'cloudflare' ? firebasePasswordConfig(environment) : null;
    if (!config) return authError(503, 'PASSWORD_RESET_UNAVAILABLE', 'Khôi phục mật khẩu HANZI.OS đang được chuẩn bị.');
    if (!await consumeAuthPasswordRateLimit(database, request, body.oobCode, Date.now(), 'reset-action')) {
      return authError(429, 'AUTH_RATE_LIMITED', 'Bạn đã thử nhiều lần. Hãy chờ 10 phút rồi thử lại.', { 'retry-after': '600' });
    }
    if (body.operation === 'verify') {
      await verifyFirebasePasswordReset(config, body.oobCode);
      return Response.json({ valid: true }, { headers: AUTH_JSON_HEADERS });
    }
    await confirmFirebasePasswordReset(config, body.oobCode, body.newPassword as string);
    // Existing sessions are fenced by their next live credential check. This
    // action neither creates a session nor touches any learner data/owner.
    return Response.json({ completed: true }, { headers: AUTH_JSON_HEADERS });
  } catch (error) {
    if (error instanceof FirebasePasswordActionInvalidError) {
      return authError(409, 'RESET_LINK_INVALID', 'Liên kết đã hết hạn hoặc đã dùng. Hãy yêu cầu liên kết mới.');
    }
    if (error instanceof FirebasePasswordPolicyError) return authError(422, 'PASSWORD_POLICY', HANZI_PASSWORD_POLICY_MESSAGE);
    return authError(503, 'PASSWORD_RESET_UNAVAILABLE', 'Chưa xác nhận được kết quả. Hãy thử đăng nhập bằng mật khẩu mới hoặc yêu cầu liên kết mới.');
  }
}
