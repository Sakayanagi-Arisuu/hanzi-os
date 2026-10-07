import {
  isStudioItemType,
  isStudioLevel,
} from "../../../../src/content/studioContent";
import { parsePublishedStudioCharacters } from "../../../../src/content/publishedStudioCharacters";
import { parsePublishedStudioLearning } from "../../../../src/content/publishedStudioLessons";
import { parsePublishedStudioPronunciation } from "../../../../src/content/publishedStudioPronunciation";
import { parsePublishedStudioVocabulary } from "../../../../src/content/publishedStudioVocabulary";
import { studioError } from "../../../../src/server/contentStudioHttp";
import { ContentStudioRepository, type PublishedStudioRuntimeItem } from "../../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";
import { requestPremiumAccess, requirePremiumLevel, sandboxCommerceEnabled } from "../../../../src/server/premiumAccess";
import { LessonAccessRepository } from "../../../../src/server/lessonAccessRepository";

export const dynamic = "force-dynamic";

const LEARNER_SAFE_ITEM_TYPES = new Set([
  "vocabulary",
  "character",
  "grammar",
  "pronunciation",
  "communicative_function",
  "graded_text",
  "lesson",
]);
const LEARNER_PROJECTIONS = new Set([
  "vocabulary", "character", "pronunciation", "learning",
]);

export function belongsToPremiumLesson(item: PublishedStudioRuntimeItem, freeLessonIds: readonly string[] = []) {
  if (item.level !== "hsk4") return false;
  if (item.itemType === "lesson") return !freeLessonIds.includes(String(item.content.targetLessonId ?? ""));
  if (item.itemType !== "grammar" && item.itemType !== "communicative_function") return false;
  const lessonIds = item.content.sourceLessonIds;
  return Array.isArray(lessonIds) && lessonIds.some(id => typeof id === "string" && id.startsWith("hsk4-") && !freeLessonIds.includes(id));
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const itemType = query.get("type");
  const level = query.get("level");
  const projection = query.get("projection");
  if (
    (itemType && !isStudioItemType(itemType))
    || (level && !isStudioLevel(level))
    || (projection && !LEARNER_PROJECTIONS.has(projection))
    || (projection && itemType)
  ) {
    return studioError(422, "CONTENT_FILTER_INVALID", "Bộ lọc runtime không hợp lệ.");
  }
  if (itemType && !LEARNER_SAFE_ITEM_TYPES.has(itemType)) {
    return studioError(
      403,
      "CONTENT_RUNTIME_PRIVATE",
      "Loại nội dung này chỉ được xử lý trong vùng biên tập có phân quyền.",
    );
  }
  const lessonRequest = itemType === "lesson" || projection === "learning";
  try {
    const database = await getD1Database();
    const freeLessonIds = sandboxCommerceEnabled(request.url)
      ? await new LessonAccessRepository(database).freeHsk4LessonIds() : [];
    const canUseHsk4Lessons = await requestPremiumAccess(request, database).catch(() => false);
    const gate = lessonRequest && level === "hsk4" && !canUseHsk4Lessons && freeLessonIds.length === 0
      ? await requirePremiumLevel(request, level) : null;
    if (gate) return gate;
    const projectedType = projection && projection !== "learning"
      ? projection
      : itemType;
    const runtime = await new ContentStudioRepository(database).publishedRuntime({
      itemType: isStudioItemType(projectedType) ? projectedType : null,
      level: isStudioLevel(level) ? level : null,
      learnerSafe: true,
    });
    const visible = canUseHsk4Lessons ? runtime : {
      ...runtime,
      items: runtime.items.filter(item => {
        if (projection !== "learning") return !belongsToPremiumLesson(item, freeLessonIds);
        if (item.level !== "hsk4") return true;
        if (item.itemType === "lesson") return freeLessonIds.includes(String(item.content.targetLessonId ?? ""));
        const sourceIds = item.content.sourceLessonIds;
        return (item.itemType === "grammar" || item.itemType === "communicative_function")
          && Array.isArray(sourceIds) && sourceIds.length > 0
          && sourceIds.every(id => typeof id === "string" && freeLessonIds.includes(id));
      }),
    };
    if (projection === "vocabulary") return Response.json({
      schemaVersion: 1,
      projection,
      items: parsePublishedStudioVocabulary(visible),
    }, { headers: noStoreJsonHeaders });
    if (projection === "character") return Response.json({
      schemaVersion: 1,
      projection,
      items: parsePublishedStudioCharacters(visible),
    }, { headers: noStoreJsonHeaders });
    if (projection === "pronunciation") return Response.json({
      schemaVersion: 1,
      projection,
      items: [...parsePublishedStudioPronunciation(visible)],
    }, { headers: noStoreJsonHeaders });
    if (projection === "learning") {
      const learning = parsePublishedStudioLearning(visible);
      return Response.json({
        schemaVersion: 1,
        projection,
        items: [[...learning.lessons], [...learning.enhancements]],
      }, { headers: noStoreJsonHeaders });
    }
    return Response.json(visible, { headers: noStoreJsonHeaders });
  } catch {
    return studioError(503, "CONTENT_RUNTIME_UNAVAILABLE", "Projection nội dung đã publish chưa sẵn sàng.");
  }
}
