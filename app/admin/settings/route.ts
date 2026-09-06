import { authorizeAdmin } from "../../../src/server/adminHttp";
import { boundedReturnTo, sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import {
  isSystemSettingKey,
  SettingConcurrencyError,
  SystemSettingsRepository,
  type SystemSettingKey,
} from "../../../src/server/systemSettingsRepository";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "updated" | "error", value: string, returnTo?: string | null) => {
  const location = new URL(boundedReturnTo(returnTo ?? null, "/admin"), request.url);
  location.searchParams.set(key, value);
  return Response.redirect(location, 303);
};

const formValue = (key: SystemSettingKey, raw: string) => {
  if (key === "content_preview_enabled") return raw === "true";
  if (key === "default_daily_minutes") return Number(raw);
  return raw;
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu cấu hình không hợp lệ.");
  }
  const body = await readBoundedRequestText(request, 2_048);
  if (!body.ok) return redirect(request, "error", "Biểu mẫu vượt giới hạn.");
  const form = new URLSearchParams(body.text);
  const key = form.get("key");
  const rawValue = form.get("value") ?? "";
  const expectedRevision = Number(form.get("expectedRevision"));
  const returnTo = form.get("returnTo");
  if (!isSystemSettingKey(key) || !Number.isInteger(expectedRevision)) {
    return redirect(request, "error", "Biểu mẫu cấu hình không hợp lệ.", returnTo);
  }
  try {
    const authorized = await authorizeAdmin("admin:settings:write", { stepUp: true });
    if (!authorized.ok) {
      const error = await authorized.response.json() as { error?: { message?: string } };
      return redirect(request, "error", error.error?.message ?? "Không đủ quyền.", returnTo);
    }
    await new SystemSettingsRepository(authorized.context.database).update({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      key,
      value: formValue(key, rawValue),
      expectedRevision,
      requestId: requestCorrelationId(request),
    });
    return redirect(request, "updated", key, returnTo);
  } catch (error) {
    if (error instanceof SettingConcurrencyError) {
      return redirect(request, "error", "Cấu hình đã đổi ở phiên khác; hãy tải lại.", returnTo);
    }
    return redirect(
      request,
      "error",
      error instanceof Error ? error.message : "Không thể cập nhật cấu hình.",
      returnTo,
    );
  }
}
