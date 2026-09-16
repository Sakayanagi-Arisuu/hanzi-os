import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { deriveAccountKey } from '../../../../src/lib/accountKey';
import { parsePageAttemptCommand } from '../../../../src/learning/pageAttemptCommand';
import { readBoundedRequestText } from '../../../../src/server/boundedRequestBody';
import { getD1Database } from '../../../../src/server/d1';
import { LessonPageAttemptRepository, PageAttemptConflictError } from '../../../../src/server/lessonPageAttemptRepository';
import { LearningResetEpochConflictError } from '../../../../src/server/learningResetEpoch';
import { consumeMutationRateLimit, LEARNING_ATTEMPT_MUTATION_POLICY, mutationRateLimitHeaders } from '../../../../src/server/mutationRateLimit';
import { SyncRepository } from '../../../../src/server/syncRepository';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status: number, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { ...noStoreJsonHeaders, ...headers } });
const failure = (status: number, code: string, message: string, retryable = false, headers?: HeadersInit) =>
  json({ error: { code, message, retryable } }, status, headers);

/** Supported practice journal only. This route cannot grant mastery, rewards,
 * trial completion, or independent recall evidence. Ownership is server-derived.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return failure(403, 'CROSS_ORIGIN_BLOCKED', 'Không thể lưu câu trả lời từ trang khác.');
  }
  try {
    const identity = await getAuthenticatedUser();
    if (!identity) return failure(401, 'AUTH_REQUIRED', 'Đăng nhập để lưu câu trả lời vào tài khoản.');
    // A durable command captured under A must not be assigned to B if the
    // browser cookie changed while its outbox was offline. This header only
    // asserts the expected owner; it never selects the server write owner.
    const expectedOwner = request.headers.get('x-learning-owner');
    if (expectedOwner !== await deriveAccountKey(identity.userId || identity.email)) {
      return failure(409, 'PAGE_ATTEMPT_OWNER_CHANGED', 'Tài khoản đã thay đổi. Câu trả lời vẫn thuộc tài khoản đã làm bài.');
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
      return failure(415, 'JSON_REQUIRED', 'Định dạng câu trả lời không hợp lệ.');
    }
    // 12,000 Chinese characters require up to 36,000 UTF-8 bytes, plus IDs.
    const body = await readBoundedRequestText(request, 64_000);
    if (!body.ok) return failure(413, 'PAGE_ATTEMPT_TOO_LARGE', 'Câu trả lời vượt giới hạn lưu.');
    let input: unknown;
    try { input = JSON.parse(body.text); }
    catch { return failure(400, 'INVALID_JSON', 'Không đọc được câu trả lời.'); }
    const command = parsePageAttemptCommand(input);
    if (!command || (!command.response.text.trim() && !command.response.answerIds.length)) {
      return failure(422, 'INVALID_PAGE_ATTEMPT', 'Câu trả lời chưa đầy đủ hoặc không hợp lệ.');
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    // Share the existing attempt budget so changing endpoint cannot bypass it.
    const limit = await consumeMutationRateLimit(database, userId, LEARNING_ATTEMPT_MUTATION_POLICY);
    if (!limit.allowed) return failure(429, 'MUTATION_RATE_LIMITED', 'Đang có nhiều câu trả lời chờ lưu. Hãy thử lại sau.', true, mutationRateLimitHeaders(limit));
    const receipt = await new LessonPageAttemptRepository(database).record(userId, command);
    return json(receipt, receipt.duplicate ? 200 : 201, mutationRateLimitHeaders(limit));
  } catch (error) {
    if (error instanceof LearningResetEpochConflictError) {
      return failure(409, error.code, 'Câu trả lời thuộc dữ liệu trước lần đặt lại.');
    }
    if (error instanceof PageAttemptConflictError) {
      return failure(409, 'PAGE_ATTEMPT_CONFLICT', 'Không thể ghép câu trả lời với tài khoản hoặc phiên bản bài hiện tại.');
    }
    // Preserve the pending command on unavailable storage/auth/rate-limit services.
    return failure(503, 'PAGE_ATTEMPT_UNAVAILABLE', 'Chưa lưu được câu trả lời vào tài khoản. Bản trên thiết bị cần được giữ lại.', true);
  }
}
