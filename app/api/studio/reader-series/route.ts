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
import { scanEditorialReaderVocabulary } from "../../../../src/reader/editorialReaderLexiconScan";
import { READER_SERIES_BY_ID } from "../../../../src/reader/library/readerManifest";
import { lookupEditorialReaderSurface } from "../../../../src/server/editorialReaderLexiconScan";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const withQualityChecklist = (book: Parameters<typeof editorialBookToStudioLesson>[0], quality: unknown) => {
  const content = editorialBookToStudioLesson(book);
  const checklist = quality && typeof quality === "object" ? quality as Record<string, unknown> : {};
  for (const key of Object.keys(content.review.aiSelfReview) as Array<keyof typeof content.review.aiSelfReview>) content.review.aiSelfReview[key] = checklist[key] === true;
  return content;
};

/** Re-edit the same book through the existing guarded revision workflow. */
export async function PUT(request: Request) {
  if (!sameOriginMutation(request)) return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return studioError(415, "JSON_REQUIRED", "API chỉ nhận application/json.");
  try {
    const authorized = await authorizeStudio("content:drafts:write");
    if (!authorized.ok) return authorized.response;
    const bounded = await readBoundedRequestText(request, 1_100_000);
    if (!bounded.ok) return studioError(413, "CONTENT_TOO_LARGE", "Sách vượt giới hạn 1 MiB.");
    let input: Record<string, unknown>;
    try { input = JSON.parse(bounded.text); } catch { return studioError(400, "INVALID_JSON", "Không thể đọc dữ liệu sách."); }
    if (!input || typeof input.revisionId !== "string" || !Number.isInteger(input.expectedRowVersion)) return studioError(422, "READER_REVISION_INVALID", "Thiếu bản nháp hoặc phiên bản đang sửa.");
    const parsed = parseEditorialReaderBook(input.book);
    if (!parsed.ok) return studioError(422, "READER_SERIES_INVALID", parsed.errors.join(" "));
    const repository = new ContentStudioRepository(authorized.context.database);
    const current = await repository.getRevision(input.revisionId);
    const previous = parseEditorialReaderBook(current.content.readerSeries);
    if (current.content.contentKind !== "reader-series" || !previous.ok || current.stableKey !== `reader.series.${parsed.book.seriesId}` || previous.book.seriesId !== parsed.book.seriesId) return studioError(422, "READER_IDENTITY_CHANGED", "Không được đổi định danh sách trong bản đang sửa.");
    if (parsed.book.chapters.length < previous.book.chapters.length) return studioError(422, "READER_CHAPTER_REMOVED", "Giữ các chương hiện có để bảo toàn vị trí đọc; bạn có thể sửa hoặc thêm chương.");
    const lexiconScan = await scanEditorialReaderVocabulary(parsed.book.chapters, lookupEditorialReaderSurface);
    const revision = await repository.updateDraft({
      actorUserId: authorized.context.account.userId, actorSessionId: authorized.context.sessionId,
      revisionId: current.id, expectedRowVersion: Number(input.expectedRowVersion),
      title: `Vạn Quyển Các · ${parsed.book.titleVi}`, level: parsed.book.levelBand.min.toLowerCase() as "hsk1" | "hsk2" | "hsk3" | "hsk4",
      content: withQualityChecklist({ ...parsed.book, lexiconScan }, input.quality),
      idempotencyKey: readIdempotencyKey(request, input.idempotencyKey),
    });
    return Response.json({ revision }, { headers: noStoreJsonHeaders });
  } catch (error) { return studioMutationError(error); }
}

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
    const lexiconScan = await scanEditorialReaderVocabulary(
      parsed.book.chapters,
      lookupEditorialReaderSurface,
    );
    const governedBook = { ...parsed.book, lexiconScan };
    const revision = await new ContentStudioRepository(authorized.context.database).createDraft({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      itemType: "lesson",
      stableKey: `reader.series.${governedBook.seriesId}`,
      title: `Vạn Quyển Các · ${governedBook.titleVi}`,
      level: governedBook.levelBand.min.toLowerCase() as "hsk1" | "hsk2" | "hsk3" | "hsk4",
      content: withQualityChecklist(governedBook, input.quality),
      idempotencyKey: readIdempotencyKey(request, input.idempotencyKey),
    });
    return Response.json({ revision }, { status: 201, headers: noStoreJsonHeaders });
  } catch (error) {
    return studioMutationError(error);
  }
}
