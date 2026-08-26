import { handleLocalPronunciationAssessment } from "../../../../../src/server/localPronunciationAssessmentRoute";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleLocalPronunciationAssessment(request);
}
