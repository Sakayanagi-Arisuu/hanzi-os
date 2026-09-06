import {
  isStudioItemType,
  isStudioLevel,
} from "../../../../src/content/studioContent";
import { parsePublishedStudioCharacters } from "../../../../src/content/publishedStudioCharacters";
import { parsePublishedStudioLearning } from "../../../../src/content/publishedStudioLessons";
import { parsePublishedStudioPronunciation } from "../../../../src/content/publishedStudioPronunciation";
import { parsePublishedStudioVocabulary } from "../../../../src/content/publishedStudioVocabulary";
import { studioError } from "../../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

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
  try {
    const projectedType = projection && projection !== "learning"
      ? projection
      : itemType;
    const runtime = await new ContentStudioRepository(
      await getD1Database(),
    ).publishedRuntime({
      itemType: isStudioItemType(projectedType) ? projectedType : null,
      level: isStudioLevel(level) ? level : null,
      learnerSafe: true,
    });
    if (projection === "vocabulary") return Response.json({
      schemaVersion: 1,
      projection,
      items: parsePublishedStudioVocabulary(runtime),
    }, { headers: noStoreJsonHeaders });
    if (projection === "character") return Response.json({
      schemaVersion: 1,
      projection,
      items: parsePublishedStudioCharacters(runtime),
    }, { headers: noStoreJsonHeaders });
    if (projection === "pronunciation") return Response.json({
      schemaVersion: 1,
      projection,
      items: [...parsePublishedStudioPronunciation(runtime)],
    }, { headers: noStoreJsonHeaders });
    if (projection === "learning") {
      const learning = parsePublishedStudioLearning(runtime);
      return Response.json({
        schemaVersion: 1,
        projection,
        items: [[...learning.lessons], [...learning.enhancements]],
      }, { headers: noStoreJsonHeaders });
    }
    return Response.json(runtime, { headers: noStoreJsonHeaders });
  } catch {
    return studioError(503, "CONTENT_RUNTIME_UNAVAILABLE", "Projection nội dung đã publish chưa sẵn sàng.");
  }
}
