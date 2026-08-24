import { getD1Database } from "../../../../../../../src/server/d1";
import { EditorialReaderRepository } from "../../../../../../../src/server/editorialReaderRepository";
import { noStoreJsonHeaders } from "../../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ seriesId: string; chapterId: string }> },
) {
  try {
    const { seriesId, chapterId } = await context.params;
    if (!/^[a-z0-9][a-z0-9-]{2,71}$/u.test(seriesId) || !/^[a-z0-9][a-z0-9-]{2,95}$/u.test(chapterId)) return Response.json({ error: "reader-chapter-invalid" }, { status: 422, headers: noStoreJsonHeaders });
    const chapter = await new EditorialReaderRepository(await getD1Database())
      .getPublishedChapter(seriesId, chapterId);
    if (!chapter) return Response.json({ error: "reader-chapter-not-found" }, { status: 404, headers: noStoreJsonHeaders });
    return Response.json({ chapter }, { headers: noStoreJsonHeaders });
  } catch {
    return Response.json({ error: "reader-chapter-unavailable" }, { status: 503, headers: noStoreJsonHeaders });
  }
}
