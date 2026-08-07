import { authorizeAdmin } from "../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import {
  AdminCurrentSessionRevocationError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
} from "../../../src/server/authorizationRepository";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "updated" | "error", value: string) => {
  const location = new URL("/admin", request.url);
  location.searchParams.set(key, value);
  return Response.redirect(location, 303);
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu phiên không hợp lệ.");
  }
  const body = await readBoundedRequestText(request, 1_024);
  if (!body.ok) return redirect(request, "error", "Biểu mẫu vượt giới hạn.");
  const sessionId = new URLSearchParams(body.text).get("sessionId") ?? "";
  if (!sessionId || sessionId.length > 128) {
    return redirect(request, "error", "Phiên không hợp lệ.");
  }
  try {
    const authorized = await authorizeAdmin("admin:sessions:revoke", { stepUp: true });
    if (!authorized.ok) {
      const error = await authorized.response.json() as { error?: { message?: string } };
      return redirect(request, "error", error.error?.message ?? "Không đủ quyền.");
    }
    await new AuthorizationRepository(authorized.context.database).revokeManagedSession({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      sessionId,
      requestId: requestCorrelationId(request),
    });
    return redirect(request, "updated", sessionId);
  } catch (error) {
    if (error instanceof AdminCurrentSessionRevocationError) {
      return redirect(request, "error", "Dùng đăng xuất để kết thúc phiên hiện tại.");
    }
    if (error instanceof AuthorizationTargetNotFoundError) {
      return redirect(request, "error", "Không tìm thấy phiên.");
    }
    return redirect(request, "error", "Không thể thu hồi phiên.");
  }
}
