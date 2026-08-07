import { getChatGPTUser } from "../../app/chatgpt-auth";
import { noStoreJsonHeaders } from "../sync/protocol";
import { getD1Database, SyncBackendUnavailableError } from "./d1";
import { SyncRepository } from "./syncRepository";

export const mockExamError = (
  status: number,
  code: string,
  message: string,
) => Response.json(
  { error: { code, message, retryable: status >= 500 } },
  { status, headers: noStoreJsonHeaders },
);

export const authorizeMockExamLearner = async () => {
  try {
    const identity = await getChatGPTUser();
    if (!identity) {
      return {
        ok: false as const,
        response: mockExamError(
          401,
          "AUTH_REQUIRED",
          "Đăng nhập để mở Mock Exam chấm điểm phía máy chủ.",
        ),
      };
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    return { ok: true as const, database, userId };
  } catch (error) {
    const unavailable = error instanceof SyncBackendUnavailableError;
    return {
      ok: false as const,
      response: mockExamError(
        unavailable ? 503 : 500,
        unavailable ? error.code : "MOCK_EXAM_AUTH_FAILED",
        unavailable ? error.message : "Không thể xác minh phiên Mock Exam.",
      ),
    };
  }
};
