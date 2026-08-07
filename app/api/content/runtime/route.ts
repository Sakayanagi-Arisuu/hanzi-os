import {
  isStudioItemType,
  isStudioLevel,
} from "../../../../src/content/studioContent";
import { studioError } from "../../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../../src/server/contentStudioRepository";
import { getD1Database } from "../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const itemType = query.get("type");
  const level = query.get("level");
  if (
    (itemType && !isStudioItemType(itemType))
    || (level && !isStudioLevel(level))
  ) {
    return studioError(422, "CONTENT_FILTER_INVALID", "Bộ lọc runtime không hợp lệ.");
  }
  try {
    const runtime = await new ContentStudioRepository(
      await getD1Database(),
    ).publishedRuntime({
      itemType: isStudioItemType(itemType) ? itemType : null,
      level: isStudioLevel(level) ? level : null,
    });
    return Response.json(runtime, { headers: noStoreJsonHeaders });
  } catch {
    return studioError(503, "CONTENT_RUNTIME_UNAVAILABLE", "Projection nội dung đã publish chưa sẵn sàng.");
  }
}
