import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import {
  MistakeQueueIntegrityError,
  MistakeQueueRepository,
  MistakeQueueUnavailableError,
} from "../../../../src/server/mistakeQueueRepository";
import { SyncRepository } from "../../../../src/server/syncRepository";
import {
  noStoreJsonHeaders,
  type SyncApiError,
} from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { ...noStoreJsonHeaders, ...headers },
  });

const requestIdentifier = (request: Request) => {
  const provided = request.headers.get("x-request-id")?.trim();
  return provided && provided.length <= 120
    ? provided
    : crypto.randomUUID();
};

const errorResponse = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => json({
  error: { code, message, requestId, retryable },
} satisfies SyncApiError, status, { "x-request-id": requestId });

export async function GET(request: Request) {
  const requestId = requestIdentifier(request);
  try {
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Đăng nhập để đọc Nghịch Cảnh Lục của tài khoản này.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const queue = await new MistakeQueueRepository(database).read(userId);
    return json(queue, 200, { "x-request-id": requestId });
  } catch (error) {
    if (error instanceof MistakeQueueUnavailableError) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    if (error instanceof MistakeQueueIntegrityError) {
      return errorResponse(500, error.code, error.message, requestId, true);
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "mistake_queue_read_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "MISTAKE_QUEUE_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Không thể dựng Nghịch Cảnh Lục từ lịch sử đã xác minh.",
      requestId,
      true,
    );
  }
}
