import { listPremiumRichLessons } from "../../../../src/server/premiumRichLesson";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = listPremiumRichLessons().flatMap(lesson => lesson.characters.map(character => ({
    ...character,
    level: "hsk4" as const,
    lessonId: lesson.lessonId,
  })));
  return Response.json({ schemaVersion: 1, entries }, { headers: noStoreJsonHeaders });
}
