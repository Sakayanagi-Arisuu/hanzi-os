import { AUTH_JSON_HEADERS, authError, googleConfig, loadAuthRuntime, sameOriginMutation } from '../../../../../src/server/authHttp';
import { readBoundedRequestText } from '../../../../../src/server/boundedRequestBody';
import { finishNativeGoogle, startNativeGoogle } from '../../../../../src/server/nativeGoogleAuth';
import { AuditRepository, requestCorrelationId } from '../../../../../src/server/auditRepository';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'ORIGIN', 'Yêu cầu đăng nhập khác nguồn.');
  try {
    const { repository, environment, database } = await loadAuthRuntime();
    if (environment.GOOGLE_NATIVE_ENABLED !== '1') return authError(503, 'NOT_CONFIGURED', 'Đăng nhập Google trong app chưa được kết nối.');
    const config = googleConfig(environment, request);
    const bounded = await readBoundedRequestText(request, 20_480);
    if (!bounded.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu đăng nhập vượt giới hạn.');
    const input = JSON.parse(bounded.text) as Record<string, unknown>;
    if (input.operation === 'start') {
      return Response.json({ ...await startNativeGoogle(repository, input.codeChallenge), serverClientId: config.clientId }, { headers: AUTH_JSON_HEADERS });
    }
    if (input.operation !== 'finish') return authError(422, 'INVALID_OPERATION', 'Yêu cầu đăng nhập không hợp lệ.');
    const { session, linked } = await finishNativeGoogle(repository, config.clientId, input);
    await new AuditRepository(database).appendBestEffort({ category: 'auth', action: 'auth.google.signed_in', outcome: 'success',
      actorUserId: linked.userId, actorSessionId: session.sessionId, targetType: 'user', targetId: linked.userId,
      requestId: requestCorrelationId(request), metadata: { provider: 'google', native: true } });
    // Only the trusted Android plugin reads this response; its generic bridge
    // blocks every /api/auth/mobile endpoint and never returns this token to JS.
    return Response.json({ token: session.token }, { headers: AUTH_JSON_HEADERS });
  } catch { return authError(400, 'GOOGLE_NATIVE_FAILED', 'Đăng nhập chưa hoàn tất. Hãy thử lại.'); }
}
