import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { InteractionXpRepository } from "../../../../src/server/interactionXpRepository";
import { SyncRepository } from "../../../../src/server/syncRepository";
import { isValidLearningResetEpoch } from "../../../../src/learning/resetEpoch";
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
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 120 ? value : crypto.randomUUID();
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

const parseWindow = (request: Request) => {
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some((key) => !["dayStart", "dayEnd"].includes(key))) {
    return null;
  }
  const dayStart = Number(url.searchParams.get("dayStart"));
  const dayEnd = Number(url.searchParams.get("dayEnd"));
  return Number.isSafeInteger(dayStart) && Number.isSafeInteger(dayEnd)
    ? { dayStart, dayEnd }
    : null;
};

export async function GET(request: Request) {
  const requestId = requestIdentifier(request);
  const window = parseWindow(request);
  if (!window) {
    return errorResponse(400, "INVALID_XP_WINDOW", "Khoảng ngày EXP không hợp lệ.", requestId);
  }
  try {
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(401, "AUTH_REQUIRED", "Đăng nhập để tải EXP tài khoản.", requestId);
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const projection = await new InteractionXpRepository(database).read(
      userId,
      window.dayStart,
      window.dayEnd,
    );
    return json(projection, 200, { "x-request-id": requestId });
  } catch (error) {
    const unavailable = error instanceof SyncBackendUnavailableError;
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "INTERACTION_XP_UNAVAILABLE",
      "Chưa thể hợp nhất EXP tài khoản lúc này.",
      requestId,
      true,
    );
  }
}

export async function POST(request: Request) {
  const requestId = requestIdentifier(request);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return errorResponse(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu EXP khác nguồn đã bị chặn.", requestId);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse(415, "JSON_REQUIRED", "Yêu cầu EXP phải dùng JSON.", requestId);
  }
  const body = await readBoundedRequestText(request, 2_000);
  if (!body.ok) {
    return errorResponse(413, "XP_COMMAND_TOO_LARGE", "Yêu cầu EXP vượt giới hạn.", requestId);
  }
  let input: unknown;
  try {
    input = JSON.parse(body.text) as unknown;
  } catch {
    return errorResponse(400, "INVALID_JSON", "Dữ liệu EXP không hợp lệ.", requestId);
  }
  const inputRecord = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  const pronunciationCommand = inputRecord
    && Object.keys(inputRecord).length === 2
    && typeof inputRecord.rewardKey === "string"
    && inputRecord.rewardKey.length <= 240
    && isValidLearningResetEpoch(inputRecord.resetEpoch);
  const lessonCommand = inputRecord
    && Object.keys(inputRecord).length === 3
    && inputRecord.kind === "lesson"
    && typeof inputRecord.lessonId === "string"
    && inputRecord.lessonId.length > 0
    && inputRecord.lessonId.length <= 120
    && isValidLearningResetEpoch(inputRecord.resetEpoch);
  if (!pronunciationCommand && !lessonCommand) {
    return errorResponse(422, "INVALID_XP_COMMAND", "Yêu cầu thưởng không hợp lệ.", requestId);
  }
  try {
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(401, "AUTH_REQUIRED", "Đăng nhập để nhận EXP tài khoản.", requestId);
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const repository = new InteractionXpRepository(database);
    const receipt = lessonCommand
      ? await repository.claimLessonReward(
          userId,
          String(inputRecord!.lessonId),
          Number(inputRecord!.resetEpoch),
        )
      : await repository.claimPronunciationReward(
          userId,
          String(inputRecord!.rewardKey),
          Number(inputRecord!.resetEpoch),
        );
    return json(receipt, receipt.awarded ? 201 : 200, { "x-request-id": requestId });
  } catch (error) {
    const unavailable = error instanceof SyncBackendUnavailableError;
    return errorResponse(
      unavailable ? 503 : 409,
      unavailable ? error.code : "XP_REWARD_REJECTED",
      unavailable
        ? "Kho EXP chưa sẵn sàng."
        : "Phần thưởng này chưa thể ghi nhận hoặc đã hết hiệu lực.",
      requestId,
      unavailable,
    );
  }
}
