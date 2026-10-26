import { getHskLessonPathId } from "../../../../src/data/hskCurriculumGraph";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";
import { getPremiumRichLesson } from "../../../../src/server/premiumRichLesson";
import { requirePremiumLesson } from "../../../../src/server/premiumAccess";
import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { learningOwnerMismatch } from '../../../../src/server/learningOwnerHttp';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mismatch = await learningOwnerMismatch(request, await getAuthenticatedUser());
  if (mismatch) return mismatch;
  const lessonId = new URL(request.url).searchParams.get("lessonId");
  if (!lessonId || lessonId.length > 120 || getHskLessonPathId(lessonId) !== "hsk4") {
    return Response.json({ error: { code: "LESSON_INVALID", message: "Bài học không hợp lệ." } }, { status: 422, headers: noStoreJsonHeaders });
  }
  const gate = await requirePremiumLesson(request, lessonId);
  if (gate) return gate;
  const lesson = getPremiumRichLesson(lessonId);
  if (!lesson) return Response.json({ error: { code: "LESSON_UNAVAILABLE", message: "Nội dung bài học chưa sẵn sàng." } }, { status: 404, headers: noStoreJsonHeaders });
  return Response.json({ schemaVersion: 1, lesson }, { headers: noStoreJsonHeaders });
}
