import { AUTH_JSON_HEADERS, authError, firebasePasswordConfig, loadAuthRuntime, resolveRequestSession, sameOriginMutation } from '../../../../../src/server/authHttp';
import { readBoundedRequestText } from '../../../../../src/server/boundedRequestBody';
import { FirebasePasswordRejectedError } from '../../../../../src/server/firebasePasswordIdentity';
import { AuthPasswordRateLimitedError } from '../../../../../src/server/hostedHanziAuth';
import { readHostedEmailVerification, sendHostedEmailVerification } from '../../../../../src/server/hostedEmailVerification';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { database, repository, environment } = await loadAuthRuntime();
    const session = await resolveRequestSession(request, repository);
    if (!session) return authError(401, 'AUTH_REQUIRED', 'Hãy đăng nhập để kiểm tra email.');
    const config = firebasePasswordConfig(environment);
    if (!config || environment.HANZI_HOSTING_PROVIDER !== 'cloudflare') return Response.json({ available: false }, { headers: AUTH_JSON_HEADERS });
    return Response.json(await readHostedEmailVerification(database, session.userId, config.projectId), { headers: AUTH_JSON_HEADERS });
  } catch { return authError(503, 'EMAIL_VERIFICATION_UNAVAILABLE', 'Chưa kiểm tra được email. Hãy thử lại sau.'); }
}
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu khác nguồn đã bị chặn.');
  const input = await readBoundedRequestText(request, 1_024);
  if (!input.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu vượt quá giới hạn.');
  let password: unknown;
  try { password = (JSON.parse(input.text) as { password?: unknown } | null)?.password; }
  catch { return authError(400, 'INVALID_JSON', 'Không thể đọc yêu cầu.'); }
  if (typeof password !== 'string' || !password || [...password].length > 128 || new TextEncoder().encode(password).byteLength > 256) {
    return authError(422, 'PASSWORD_REQUIRED', 'Hãy nhập mật khẩu HANZI.OS để gửi thư xác minh.');
  }
  try {
    const { database, repository, environment } = await loadAuthRuntime();
    const session = await resolveRequestSession(request, repository);
    if (!session) return authError(401, 'AUTH_REQUIRED', 'Hãy đăng nhập lại trước khi gửi thư.');
    const config = environment.HANZI_HOSTING_PROVIDER === 'cloudflare' ? firebasePasswordConfig(environment) : null;
    if (!config) return authError(503, 'EMAIL_VERIFICATION_UNAVAILABLE', 'Xác minh email đang được chuẩn bị.');
    return Response.json(await sendHostedEmailVerification(database, request, session.userId, config, password), { headers: AUTH_JSON_HEADERS });
  } catch (error) {
    if (error instanceof FirebasePasswordRejectedError) return authError(401, 'PASSWORD_REJECTED', 'Mật khẩu HANZI.OS chưa đúng. Hãy thử lại.');
    if (error instanceof AuthPasswordRateLimitedError) return authError(429, 'AUTH_RATE_LIMITED', 'Bạn đã yêu cầu nhiều lần. Hãy chờ 10 phút rồi thử lại.', { 'retry-after': '600' });
    return authError(503, 'EMAIL_VERIFICATION_UNAVAILABLE', 'Chưa gửi được thư xác minh. Hãy thử lại sau.');
  }
}
