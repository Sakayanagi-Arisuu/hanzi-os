import { authorizeMockExamLearner } from "../../../../src/server/hskMockExamHttp";
import { HskMockExamRepository } from "../../../../src/server/hskMockExamRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
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
