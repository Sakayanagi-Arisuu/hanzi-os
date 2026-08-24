import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import {
  authorizeStudio,
  readIdempotencyKey,
  studioError,
  studioMutationError,
} from "../../../../src/server/contentStudioHttp";
import { ContentStudioRepository } from "../../../../src/server/contentStudioRepository";
import {
  editorialBookToStudioLesson,
  parseEditorialReaderBook,
} from "../../../../src/reader/editorialReaderContent";
import { READER_SERIES_BY_ID } from "../../../../src/reader/library/readerManifest";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return studioError(415, "JSON_REQUIRED", "API chỉ nhận application/json.");
  const bounded = await readBoundedRequestText(request, 1_100_000);
  if (!bounded.ok) return studioError(413, "CONTENT_TOO_LARGE", "Sách vượt giới hạn 1 MiB của một revision.");
  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return studioError(400, "INVALID_JSON", "Không thể đọc dữ liệu sách.");
  }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const parsed = parseEditorialReaderBook(input.book);
  if (!parsed.ok) return studioError(422, "READER_SERIES_INVALID", parsed.errors.join(" "));
  if (READER_SERIES_BY_ID.has(parsed.book.seriesId)) return studioError(409, "READER_SERIES_EXISTS", "Mã sách đã tồn tại trong Vạn Quyển Các.");
  try {
    const authorized = await authorizeStudio("content:drafts:write");
    if (!authorized.ok) return authorized.response;
    const revision = await new ContentStudioRepository(authorized.context.database).createDraft({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      itemType: "lesson",
      stableKey: `reader.series.${parsed.book.seriesId}`,
      title: `Vạn Quyển Các · ${parsed.book.titleVi}`,
      level: parsed.book.levelBand.min.toLowerCase() as "hsk1" | "hsk2" | "hsk3" | "hsk4",
      content: editorialBookToStudioLesson(parsed.book),
      idempotencyKey: readIdempotencyKey(request, input.idempotencyKey),
    });
    return Response.json({ revision }, { status: 201, headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}
