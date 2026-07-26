import { getChatGPTUser } from "../../chatgpt-auth";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { getD1Database, SyncBackendUnavailableError } from "../../../src/server/d1";
import {
  ACCOUNT_DELETE_MUTATION_POLICY,
  consumeMutationRateLimit,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
} from "../../../src/server/mutationRateLimit";
import { SyncRepository } from "../../../src/server/syncRepository";
import { noStoreJsonHeaders } from "../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 4_096;

const errorJson = (
  status: number,
  code: string,
  message: string,
  retryable = false,
  extraHeaders?: HeadersInit,
) =>
  Response.json(
    { error: { code, message, retryable } },
    { status, headers: { ...noStoreJsonHeaders, ...extraHeaders } },
  );

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return errorJson(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu xóa khác nguồn đã bị chặn.");
  }
  const identity = await getChatGPTUser();
  if (!identity) return errorJson(401, "AUTH_REQUIRED", "Đăng nhập để xóa tài khoản.");

  try {
    const database = await getD1Database();
    const repository = new SyncRepository(database);
    const userId = await repository.resolveUser(identity);
    const rateLimit = await consumeMutationRateLimit(
      database,
      userId,
      ACCOUNT_DELETE_MUTATION_POLICY,
    );
    const rateHeaders = mutationRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) {
      return errorJson(
        429,
        "MUTATION_RATE_LIMITED",
        "Quá nhiều yêu cầu xóa tài khoản; hãy thử lại sau.",
        true,
        rateHeaders,
      );
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorJson(
        415,
        "JSON_REQUIRED",
        "API xóa tài khoản chỉ nhận application/json.",
        false,
        rateHeaders,
      );
    }
    const boundedBody = await readBoundedRequestText(
      request,
      MAX_REQUEST_BYTES,
    );
    if (!boundedBody.ok) {
      return errorJson(
        413,
        "ACCOUNT_DELETE_PAYLOAD_TOO_LARGE",
        "Xác nhận xóa tài khoản vượt giới hạn kích thước.",
        false,
        rateHeaders,
      );
    }
    const raw = boundedBody.text;
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return errorJson(
        400,
        "INVALID_JSON",
        "Không thể đọc xác nhận xóa tài khoản.",
        false,
        rateHeaders,
      );
    }
    if (
      !body
      || typeof body !== "object"
      || (body as { confirmation?: unknown }).confirmation !== "DELETE HANZI.OS"
    ) {
      return errorJson(
        422,
        "CONFIRMATION_REQUIRED",
        "Cần xác nhận chính xác trước khi xóa tài khoản.",
        false,
        rateHeaders,
      );
    }

    await repository.deleteAccount(userId);
    return Response.json(
      { deleted: true, deletedAt: new Date().toISOString() },
      { status: 200, headers: { ...noStoreJsonHeaders, ...rateHeaders } },
    );
  } catch (error) {
    if (error instanceof MutationRateLimitBackendError) {
      return errorJson(
        503,
        error.code,
        "Không thể xác minh giới hạn xóa tài khoản an toàn lúc này.",
        true,
      );
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    return errorJson(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ACCOUNT_DELETE_FAILED",
      unavailable ? error.message : "Không thể xóa tài khoản lúc này.",
      true,
    );
  }
}
