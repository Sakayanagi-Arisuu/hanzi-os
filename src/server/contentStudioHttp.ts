import type { AppPermission } from "../auth/authorization";
import { noStoreJsonHeaders } from "../sync/protocol";
import { authorizeAdmin } from "./adminHttp";
import {
  ContentStudioConcurrencyError,
  ContentStudioIdempotencyError,
  ContentStudioNotFoundError,
  ContentStudioTransitionError,
} from "./contentStudioRepository";

export const studioError = (status: number, code: string, message: string) =>
  Response.json(
    { error: { code, message, retryable: status >= 500 } },
    { status, headers: noStoreJsonHeaders },
  );

export const authorizeStudio = (
  permission: AppPermission,
  options?: { stepUp?: boolean },
) => options ? authorizeAdmin(permission, options) : authorizeAdmin(permission);

export const studioMutationError = (error: unknown) => {
  if (error instanceof ContentStudioConcurrencyError) {
    return studioError(409, error.code, "Revision đã đổi ở một phiên biên tập khác.");
  }
  if (error instanceof ContentStudioIdempotencyError) {
    return studioError(409, error.code, "Idempotency key đã dùng cho một lệnh nội dung khác.");
  }
  if (error instanceof ContentStudioNotFoundError) {
    return studioError(404, error.code, "Không tìm thấy revision nội dung.");
  }
  if (error instanceof ContentStudioTransitionError || error instanceof TypeError) {
    return studioError(
      422,
      error instanceof ContentStudioTransitionError
        ? error.code
        : "CONTENT_INPUT_INVALID",
      error.message,
    );
  }
  return studioError(500, "CONTENT_STUDIO_FAILED", "Content Studio chưa thể hoàn tất thao tác.");
};

export const readIdempotencyKey = (
  request: Request,
  bodyValue: unknown,
) => {
  const value = request.headers.get("idempotency-key") ?? bodyValue;
  return typeof value === "string" ? value.trim() : "";
};
