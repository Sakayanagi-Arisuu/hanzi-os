import { boundedReturnTo, sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import { authorizeAdmin } from "../../../src/server/adminHttp";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import {
  ContentReleaseFenceError,
  ContentReleaseWorkerRepository,
  processContentReleaseBatch,
} from "../../../src/server/contentReleaseWorker";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "updated" | "error", message: string, returnTo?: string | null) => {
  const target = new URL(boundedReturnTo(returnTo ?? null, "/admin"), request.url);
  target.searchParams.set(key, message.slice(0, 400));
  if (target.pathname === "/admin") target.hash = "editorial-operations";
  return Response.redirect(target, 303);
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu khôi phục đồng bộ không hợp lệ.");
  }
  const bounded = await readBoundedRequestText(request, 10_000);
  if (!bounded.ok) return redirect(request, "error", "Biểu mẫu khôi phục vượt giới hạn an toàn.");
  const authorized = await authorizeAdmin("content:publish", { stepUp: true });
  if (!authorized.ok) return redirect(request, "error", "Hãy xác minh lại tài khoản trước khi khôi phục đồng bộ.");
  let returnTo: string | null = null;
  try {
    const form = new URLSearchParams(bounded.text);
    returnTo = form.get("returnTo");
    const eventId = form.get("eventId") ?? "";
    if (!eventId || eventId.length > 255 || eventId.includes("\0")) {
      return redirect(request, "error", "Sự cố đồng bộ không hợp lệ.");
    }
    await new ContentReleaseWorkerRepository(authorized.context.database).replayDeadRelease({
      eventId,
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      correlationId: requestCorrelationId(request),
    });
    await processContentReleaseBatch(authorized.context.database);
    return redirect(request, "updated", "Đã thử đồng bộ lại gói nội dung.", returnTo);
  } catch (error) {
    return redirect(
      request,
      "error",
      error instanceof ContentReleaseFenceError
        ? error.message
        : "Chưa thể đồng bộ lại; sự cố vẫn được giữ trong hàng chờ để kiểm tra.",
      returnTo,
    );
  }
}
