import { authorizeMockExamLearner } from "../../../../src/server/hskMockExamHttp";
import { HskMockExamRepository } from "../../../../src/server/hskMockExamRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";
import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { learningOwnerMismatch } from '../../../../src/server/learningOwnerHttp';

export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  const mismatch = await learningOwnerMismatch(request, await getAuthenticatedUser()); if (mismatch) return mismatch;
  const authorized = await authorizeMockExamLearner();
  if (!authorized.ok) return authorized.response;
  try {
    const history = await new HskMockExamRepository(
      authorized.database,
    ).history(authorized.userId);
    return Response.json({ history }, { headers: noStoreJsonHeaders });
  } catch {
    return Response.json(
      { error: { code: "MOCK_EXAM_HISTORY_FAILED", message: "Không thể đọc lịch sử Mock Exam." } },
      { status: 500, headers: noStoreJsonHeaders },
    );
  }
}
