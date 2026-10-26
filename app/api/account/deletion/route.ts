import { AUTH_JSON_HEADERS, authError, loadAuthRuntime, recentFirstPartySession, resolveRequestSession, sameOriginMutation } from '../../../../src/server/authHttp';
import { consumeAuthPasswordRateLimit } from '../../../../src/server/authPasswordRateLimit';
import { readBoundedRequestText } from '../../../../src/server/boundedRequestBody';
import { AccountDeletionConflictError, AccountDeletionRepository, validAccountDeletionToken } from '../../../../src/server/accountDeletionRepository';
import { AccountDeletionRestrictedError } from '../../../../src/server/accountDeletionPolicy';
import { deriveAccountKey } from '../../../../src/lib/accountKey';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return authError(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu khác nguồn đã bị chặn.');
  if (request.headers.get('content-type')?.split(';')[0]?.toLowerCase() !== 'application/json') return authError(415, 'JSON_REQUIRED', 'Không thể đọc yêu cầu xóa.');
  const input = await readBoundedRequestText(request, 1_024);
  if (!input.ok) return authError(413, 'REQUEST_TOO_LARGE', 'Dữ liệu vượt quá giới hạn.');
  let body: { confirmation?: unknown; deletionToken?: unknown; ownerKey?: unknown } | null;
  try { body = JSON.parse(input.text); } catch { return authError(400, 'INVALID_JSON', 'Không thể đọc yêu cầu xóa.'); }
  if (body?.confirmation !== 'DELETE HANZI.OS' || !validAccountDeletionToken(body.deletionToken)
    || typeof body.ownerKey !== 'string' || !/^siwc_[a-f0-9]{64}$/u.test(body.ownerKey)) return authError(422, 'CONFIRMATION_REQUIRED', 'Cần xác nhận xóa tài khoản từ ứng dụng.');
  try {
    const { database, repository } = await loadAuthRuntime();
    if (!await consumeAuthPasswordRateLimit(database, request, body.deletionToken, Date.now(), 'account-deletion')) {
      return authError(429, 'AUTH_RATE_LIMITED', 'Bạn đã thử nhiều lần. Hãy chờ 10 phút rồi kiểm tra lại.', { 'retry-after': '600' });
    }
    const deletion = new AccountDeletionRepository(database);
    let job = await deletion.find(body.deletionToken);
    if (!job) {
      const session = await resolveRequestSession(request, repository);
      const witness = recentFirstPartySession(session);
      if (!witness) return authError(401, 'DELETION_REAUTH_REQUIRED', 'Hãy đăng nhập lại để xác nhận xóa tài khoản.');
      // A receipt saved before an undelivered first request must never freeze
      // a different account signed in later on this device.
      if (body.ownerKey !== await deriveAccountKey(witness.userId)) throw new AccountDeletionConflictError('Deletion owner changed.');
      job = await deletion.start(witness.userId, body.deletionToken, witness.sessionId, witness.authenticatedAt);
      // Persist/freeze first, then execute in a separate invocation so both
      // calls fit Cloudflare Free's D1 query budget.
      return Response.json(await deletion.result(job), { status: 202, headers: AUTH_JSON_HEADERS });
    }
    if (body.ownerKey !== await deriveAccountKey(job.userId)) throw new AccountDeletionConflictError('Deletion receipt owner mismatch.');
    if (job.expiresAt <= Date.now()) throw new AccountDeletionConflictError('Deletion receipt expired.');
    const result = await deletion.run(job);
    return Response.json(result, { status: result.deleted ? 200 : 202, headers: AUTH_JSON_HEADERS });
  } catch (error) {
    if (error instanceof AccountDeletionRestrictedError) return authError(409, 'ACCOUNT_DELETION_RESTRICTED', 'Tài khoản còn gắn hồ sơ biên tập, quản trị hoặc thanh toán. Hãy liên hệ hỗ trợ trước khi xóa.');
    if (error instanceof AccountDeletionConflictError) return authError(409, 'ACCOUNT_DELETION_RECEIPT_INVALID', 'Chưa xác nhận được yêu cầu xóa. Dữ liệu trên thiết bị vẫn được giữ; hãy liên hệ hỗ trợ.');
    return authError(503, 'ACCOUNT_DELETION_UNAVAILABLE', 'Chưa xác nhận được kết quả xóa. Dữ liệu trên thiết bị vẫn được giữ; hãy kiểm tra lại.');
  }
}
