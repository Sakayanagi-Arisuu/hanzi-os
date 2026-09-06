import { authorizeAdmin } from "../../../src/server/adminHttp";
import { boundedReturnTo, sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import {
  AdminSelfLockError,
  AuthorizationConcurrencyError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
  LastAdminProtectionError,
} from "../../../src/server/authorizationRepository";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "updated" | "error", value: string, returnTo?: string | null) => {
  const location = new URL(boundedReturnTo(returnTo ?? null, "/admin"), request.url);
  location.searchParams.set(key, value);
  return Response.redirect(location, 303);
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu trạng thái không hợp lệ.");
  }
  const body = await readBoundedRequestText(request, 2_048);
  if (!body.ok) return redirect(request, "error", "Biểu mẫu vượt giới hạn.");
  const form = new URLSearchParams(body.text);
  const userId = form.get("userId") ?? "";
  const locked = form.get("locked");
  const reason = form.get("reason") ?? "";
  const expectedRevision = Number(form.get("expectedRevision"));
  const returnTo = form.get("returnTo");
  if (
    !userId
    || (locked !== "true" && locked !== "false")
    || !Number.isInteger(expectedRevision)
  ) {
    return redirect(request, "error", "Biểu mẫu trạng thái không hợp lệ.", returnTo);
  }
  try {
    const authorized = await authorizeAdmin("admin:users:lock", { stepUp: true });
    if (!authorized.ok) {
      const error = await authorized.response.json() as { error?: { message?: string } };
      return redirect(request, "error", error.error?.message ?? "Không đủ quyền.", returnTo);
    }
    await new AuthorizationRepository(authorized.context.database).setAccountLocked({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      targetUserId: userId,
      locked: locked === "true",
      reason,
      expectedRevision,
      requestId: requestCorrelationId(request),
    });
    return redirect(request, "updated", userId, returnTo);
  } catch (error) {
    if (error instanceof AuthorizationConcurrencyError) {
      return redirect(request, "error", "Dữ liệu đã đổi ở phiên khác; hãy tải lại.", returnTo);
    }
    if (error instanceof AuthorizationTargetNotFoundError) {
      return redirect(request, "error", "Không tìm thấy tài khoản.", returnTo);
    }
    if (error instanceof AdminSelfLockError || error instanceof LastAdminProtectionError) {
      return redirect(request, "error", "Không thể khóa tài khoản quản trị này.", returnTo);
    }
    return redirect(request, "error", "Không thể đổi trạng thái tài khoản.", returnTo);
  }
}
