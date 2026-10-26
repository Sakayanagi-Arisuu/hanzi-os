import { getAuthenticatedUser } from '../../../../../chatgpt-auth';
import { deriveAccountKey } from '../../../../../../src/lib/accountKey';
import { authorizeMockExamLearner, mockExamError } from '../../../../../../src/server/hskMockExamHttp';
import { resolveHskMockExamDefinition } from '../../../../../../src/server/hskMockExamEditorialRepository';
import { requireMockExamAccess } from '../../../../../../src/server/mockExamAccessHttp';
import { offlineMockPackage, gradeOfflineMockPractice } from '../../../../../../src/server/offlineMockPractice';
import { readBoundedRequestText } from '../../../../../../src/server/boundedRequestBody';
import { requireCurrentLearningResetEpoch, LearningResetEpochConflictError, isValidLearningResetEpoch } from '../../../../../../src/server/learningResetEpoch';
import { learningOwnerMismatch } from '../../../../../../src/server/learningOwnerHttp';
import { WorkspaceRepository } from '../../../../../../src/server/workspaceRepository';
import { consumeMutationRateLimit, mutationRateLimitHeaders, ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY } from '../../../../../../src/server/mutationRateLimit';
import { noStoreJsonHeaders } from '../../../../../../src/sync/protocol';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ level: string; form: string }> };
async function authorized(request: Request, context: Context) {
  const learner = await authorizeMockExamLearner();
  if (!learner.ok) return { response: learner.response };
  const mismatch = await learningOwnerMismatch(request, await getAuthenticatedUser());
  if (mismatch) return { response: mismatch };
  const { level, form } = await context.params;
  const definition = await resolveHskMockExamDefinition(learner.database, level, form);
  if (!definition) return { response: mockExamError(404, 'PRACTICE_NOT_FOUND', 'Cửa luyện này chưa có nội dung.') };
  const denied = await requireMockExamAccess(request, definition, learner.database);
  return denied ? { response: denied } : { learner, definition };
}
export async function GET(request: Request, context: Context) {
  try {
    const access = await authorized(request, context);
    if (access.response) return access.response;
    return Response.json(await offlineMockPackage(access.definition!), { headers: noStoreJsonHeaders });
  } catch { return mockExamError(503, 'PRACTICE_UNAVAILABLE', 'Chưa chuẩn bị được đề luyện.'); }
}
export async function POST(request: Request, context: Context) {
  if ((request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
    || request.headers.get('sec-fetch-site') === 'cross-site') return mockExamError(403, 'CROSS_ORIGIN_BLOCKED', 'Yêu cầu không hợp lệ.');
  try {
    const access = await authorized(request, context);
    if (access.response) return access.response;
    const { learner, definition } = access;
    const identity = await getAuthenticatedUser();
    if (!identity || request.headers.get('x-learning-owner') !== await deriveAccountKey(identity.userId || identity.email)) {
      return mockExamError(409, 'OWNER_CHANGED', 'Tài khoản vừa thay đổi; lượt luyện vẫn được giữ.');
    }
    const limit = await consumeMutationRateLimit(learner!.database, learner!.userId, ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY);
    if (!limit.allowed) return Response.json({ error: { code: 'PRACTICE_PACING', message: 'Lượt luyện sẽ tự gửi lại sau.' } },
      { status: 429, headers: { ...noStoreJsonHeaders, ...mutationRateLimitHeaders(limit) } });
    const body = await readBoundedRequestText(request, 400_000);
    if (!body.ok) return mockExamError(413, 'PRACTICE_TOO_LARGE', 'Lượt luyện quá lớn.');
    let input;
    try { input = JSON.parse(body.text); } catch { return mockExamError(400, 'INVALID_JSON', 'Lượt luyện chưa hợp lệ.'); }
    if (!input || !isValidLearningResetEpoch(input.resetEpoch)) return mockExamError(422, 'INVALID_RESET', 'Lượt luyện chưa hợp lệ.');
    await requireCurrentLearningResetEpoch(learner!.database, learner!.userId, input.resetEpoch);
    let result;
    try { result = await gradeOfflineMockPractice(definition!, input.run); }
    catch { return mockExamError(409, 'PRACTICE_VERSION_CHANGED', 'Nội dung lượt luyện chưa khớp phiên bản; câu trả lời vẫn được giữ trên thiết bị.'); }
    const { review: _review, ...summary } = result;
    // Descriptive practice history only. Never writes assessment/evidence/XP tables.
    await new WorkspaceRepository(learner!.database).exchange(learner!.userId, input.resetEpoch, [{
      key: `exam.practice:${result.sessionId}`, value: { ...summary, review: [] },
      changedAt: Date.parse(result.submittedAt), changeId: `mock-result:${result.sessionId}`,
    }]);
    return Response.json({ result }, { headers: noStoreJsonHeaders });
  } catch (error) {
    if (error instanceof LearningResetEpochConflictError) return mockExamError(409, 'RESET_CHANGED', 'Hồ sơ đã đặt lại; lượt luyện cũ vẫn được giữ riêng trên thiết bị.');
    return mockExamError(503, 'PRACTICE_SYNC_UNAVAILABLE', 'Máy chủ chưa sẵn sàng. Lượt luyện sẽ tự gửi lại.');
  }
}
