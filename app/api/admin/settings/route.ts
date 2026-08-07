import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { requestCorrelationId } from "../../../../src/server/auditRepository";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import {
  isSystemSettingKey,
  SettingConcurrencyError,
  SystemSettingsRepository,
} from "../../../../src/server/systemSettingsRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorized = await authorizeAdmin("admin:settings:read");
    if (!authorized.ok) return authorized.response;
    const settings = await new SystemSettingsRepository(
      authorized.context.database,
    ).list();
    return Response.json({ settings }, { headers: noStoreJsonHeaders });
  } catch {
    return adminError(500, "SYSTEM_SETTINGS_READ_FAILED", "Không thể đọc cấu hình.");
  }
}

export async function PUT(request: Request) {
  if (!sameOriginMutation(request)) {
    return adminError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return adminError(415, "JSON_REQUIRED", "API cấu hình chỉ nhận application/json.");
  }
  const bounded = await readBoundedRequestText(request, 2_048);
  if (!bounded.ok) return adminError(413, "SETTING_PAYLOAD_TOO_LARGE", "Yêu cầu quá lớn.");
  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return adminError(400, "INVALID_JSON", "Không thể đọc cấu hình.");
  }
  const input = body as { key?: unknown; value?: unknown; expectedRevision?: unknown };
  if (
    !body
    || typeof body !== "object"
    || !isSystemSettingKey(input.key)
    || typeof input.expectedRevision !== "number"
    || !Number.isInteger(input.expectedRevision)
    || input.expectedRevision < 0
  ) {
    return adminError(422, "INVALID_SETTING", "Khóa hoặc revision cấu hình không hợp lệ.");
  }
  try {
    const authorized = await authorizeAdmin("admin:settings:write", { stepUp: true });
    if (!authorized.ok) return authorized.response;
    const setting = await new SystemSettingsRepository(
      authorized.context.database,
    ).update({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      key: input.key,
      value: input.value,
      expectedRevision: input.expectedRevision,
      requestId: requestCorrelationId(request),
    });
    return Response.json({ setting }, { headers: noStoreJsonHeaders });
  } catch (error) {
    if (error instanceof SettingConcurrencyError) {
      return adminError(409, error.code, "Cấu hình đã đổi ở phiên quản trị khác.");
    }
    return adminError(422, "SETTING_UPDATE_REJECTED", error instanceof Error ? error.message : "Cấu hình bị từ chối.");
  }
}
