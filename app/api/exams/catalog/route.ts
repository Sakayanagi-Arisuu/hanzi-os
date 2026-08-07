import { HSK_MOCK_EXAM_DEFINITIONS } from "../../../../src/server/hskMockExamBank";
import { publicHskMockExamDefinition } from "../../../../src/server/hskMockExamRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { forms: HSK_MOCK_EXAM_DEFINITIONS.map(publicHskMockExamDefinition) },
    { headers: noStoreJsonHeaders },
  );
}
