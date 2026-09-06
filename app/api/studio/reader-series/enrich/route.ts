import { sameOriginMutation } from "../../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../../src/server/boundedRequestBody";
import { authorizeStudio, studioError } from "../../../../../src/server/contentStudioHttp";
import {
  enrichReaderWithGemini,
  ReaderEnrichmentConfigurationError,
  ReaderEnrichmentInputError,
  ReaderEnrichmentProtocolError,
  ReaderEnrichmentRemoteError,
} from "../../../../../src/server/geminiReaderEnrichment";
import { noStoreJsonHeaders } from "../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return studioError(415, "JSON_REQUIRED", "API chỉ nhận application/json.");
  }
  const bounded = await readBoundedRequestText(request, 96_000);
  if (!bounded.ok) return studioError(413, "CONTENT_TOO_LARGE", "Bản thảo vượt giới hạn xử lý trong một lần.");
  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return studioError(400, "INVALID_JSON", "Không thể đọc bản thảo.");
  }
  const authorized = await authorizeStudio("content:drafts:write");
  if (!authorized.ok) return authorized.response;
  const apiKey = process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
  try {
    const enriched = await enrichReaderWithGemini({
      config: { apiKey, model: process.env.GEMINI_TEXT_MODEL },
      input: body,
    });
    return Response.json({ enriched }, { headers: noStoreJsonHeaders });
  } catch (error) {
    if (error instanceof ReaderEnrichmentConfigurationError) {
      return studioError(503, error.code, "Chưa cấu hình Gemini cho Biên Tập Viện.");
    }
    if (error instanceof ReaderEnrichmentInputError) {
      return studioError(422, error.code, error.message);
    }
    if (error instanceof ReaderEnrichmentRemoteError) {
      return studioError(502, error.code, "Gemini chưa thể xử lý bản thảo. Hãy thử lại sau.");
    }
    if (error instanceof ReaderEnrichmentProtocolError) {
      return studioError(502, error.code, "Kết quả AI chưa đúng cấu trúc. Bản thảo của bạn vẫn được giữ nguyên.");
    }
    return studioError(500, "READER_ENRICHMENT_FAILED", "Chưa thể tạo Pinyin và bản dịch.");
  }
}
