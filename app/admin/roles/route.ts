import { authorizeAdmin } from "../../../src/server/adminHttp";
import { boundedReturnTo, sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import {
  AdminRoleSelfRevocationError,
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
    return redirect(request, "error", "Biểu mẫu phân quyền không hợp lệ.");
  }
  const body = await readBoundedRequestText(request, 2_048);
  if (!body.ok) return redirect(request, "error", "Biểu mẫu phân quyền vượt giới hạn.");
  const form = new URLSearchParams(body.text);
  const userId = form.get("userId") ?? "";
  const role = form.get("role");
  const rawEnabled = form.get("enabled");
  const expectedRevision = Number(form.get("expectedRevision"));
  const returnTo = form.get("returnTo");
  if (
    !userId
    || userId.length > 128
    || (role !== "content_editor" && role !== "admin")
    || (rawEnabled !== "true" && rawEnabled !== "false")
    || !Number.isInteger(expectedRevision)
    || expectedRevision < 1
  ) {
    return redirect(request, "error", "Yêu cầu phân quyền không hợp lệ.", returnTo);
  }

  try {
    const authorized = await authorizeAdmin("admin:roles:write", { stepUp: true });
    if (!authorized.ok) {
      const error = await authorized.response.json() as { error?: { message?: string } };
      return redirect(request, "error", error.error?.message ?? "Không đủ quyền.", returnTo);
    }
    await new AuthorizationRepository(authorized.context.database).setRole({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      targetUserId: userId,
      role,
      enabled: rawEnabled === "true",
      expectedRevision,
      requestId: requestCorrelationId(request),
    });
    return redirect(request, "updated", userId, returnTo);
  } catch (error) {
    if (error instanceof AdminRoleSelfRevocationError) {
      return redirect(request, "error", "Không thể tự thu quyền quản trị của tài khoản đang dùng.", returnTo);
    }
    if (error instanceof AuthorizationTargetNotFoundError) {
      return redirect(request, "error", "Không tìm thấy tài khoản cần phân quyền.", returnTo);
    }
    if (error instanceof AuthorizationConcurrencyError) {
      return redirect(request, "error", "Dữ liệu đã đổi ở phiên khác; hãy tải lại.", returnTo);
    }
    if (error instanceof LastAdminProtectionError) {
      return redirect(request, "error", "Không thể thu quyền quản trị viên cuối cùng.", returnTo);
    }
    return redirect(request, "error", "Không thể cập nhật quyền lúc này.", returnTo);
  }
}
